const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

module.exports = verify;

function verify(attestations, fileStreamOrShasum, keyring, cb) {
  if (typeof fileStreamOrShasum === 'string') {
    return Promise.all(attestations.map(attestation => {
      return verifyWithShasum(attestation, fileStreamOrShasum, keyring);
    })).then(results => cb(null, results)).catch(cb);
  }
  const hash = crypto.createHash('sha256');
  hash.on('readable', () => {
    const data = hash.read();
    if (!data) return;
    const shasum = data.toString('hex');
    Promise.all(attestations.map(attestation => {
      return verifyWithShasum(attestation, shasum, keyring);
    })).then(results => cb(null, results)).catch(cb);
  });
  fileStreamOrShasum.pipe(hash);
}

function verifyWithShasum(attestation, shasum, keyring) {
  const sigData = attestation.data;
  if (sigData.id !== `sha256:${shasum}`) {
    return Promise.reject(new Error('Attestation has wrong shasum'));
  }
  return new Promise((resolve, reject) => {
    gpgVerify(sigData, attestation.sig, attestation.key, keyring, (err, statusText) => {
      const statusBlob = {};
      const lines = statusText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        l = lines[i];
        if (!l.startsWith('[GNUPG:] ')) continue;
        if (l.startsWith('[GNUPG:] NO_PUBKEY')) {
          statusBlob.unknownKey = true;
        }
        if (l.startsWith('[GNUPG:] VALIDSIG')) {
          const splitted = l.split(' ');
          statusBlob.validSig = {
            fingerprint: splitted[2],
            time: new Date(parseInt(splitted[4]+'000', 10))
          };
          if (statusBlob.validSig.fingerprint !== attestation.key) {
            return rej(new Error(`Key mismatch: expected ${attestation.key} got ${statusBlob.validSig.fingerprint}`));
          }
        }
      }
      resolve(statusBlob);
    });
  });
}

let counter = 0;

function gpgVerify(sigData, signature, keyid, keyring, cb) {
  // TODO figure out how to do this without a tempfile, using file descriptors
  const tmpId = counter++;
  const tmpDataFile = path.resolve(os.tmpdir(), `signet-temp-data-${process.pid}-${tmpId}.txt`);
  const tmpSigFile = path.resolve(os.tmpdir(), `signet-temp-sig-${process.pid}-${tmpId}.sig`);
  fs.writeFile(tmpDataFile, JSON.stringify(sigData), err => {
    if (err) return cb(err);
    fs.writeFile(tmpSigFile, Buffer.from(signature, 'base64'), err => {
      if (err) return cb(err);
      const gpgArgs = [
        '--status-fd=2',
        '--no-default-keyring',
        `--keyring=${keyring}`,
        '--verify',
        tmpSigFile,
        tmpDataFile,
      ];
      const proc = child_process.spawn('gpg', gpgArgs);

      const statusBuffers = [];
      proc.stderr.on('data', d => statusBuffers.push(d));
      proc.stderr.on('end', () => {
        fs.unlink(tmpDataFile, () => {
          fs.unlink(tmpSigFile, () => {
            cb(null, Buffer.concat(statusBuffers).toString('utf8'));
          });
        });
      });
    });
  });
}
