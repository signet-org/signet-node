const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

module.exports = verify;

function verify(attestation, fileStreamOrShasum, cb) {
  if (typeof fileStreamOrShasum === 'string') {
    verifyWithShasum(attestation, shasum, cb);
  }
  const hash = crypto.createHash('sha256');
  hash.on('readable', () => {
    const data = hash.read();
    if (!data) return;
    verifyWithShasum(attestation, data.toString('hex'), cb);
  });
  fileStreamOrShasum.pipe(hash);
}

function verifyWithShasum(attestation, shasum, cb) {
  const sigData = attestation.data;
  if (sigData.id !== `sha256:${shasum}`) {
    return cb(new Error('Attestation has wrong shasum'));
  }
  gpgVerify(sigData, attestation.sig, attestation.key, (err, statusText) => {
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
          return cb(new Error(`Key mismatch: expected ${attestation.key} got ${statusBlob.validSig.fingerprint}`));
        }
      }
    }
    cb(null, statusBlob);
  });
}

let counter = 0;

function gpgVerify(sigData, signature, keyid, cb) {
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
