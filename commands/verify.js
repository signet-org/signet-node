const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const verify = require('../lib/verify');
const serverGet = require('../lib/server-get');

exports.command = 'verify [<attestedfile> [<attestationfile>]]';

exports.describe = 'verify an attestation file';

function getAbsolute(filename) {
  if (!filename) {
    return;
  }
  if (!path.isAbsolute(filename)) {
    return path.resolve(process.cwd(), filename);
  } else {
    return filename;
  }
}

function requireJSON(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function getHashAndData(stream, cb) {
  const bufs = [];
  const hash = crypto.createHash('sha256');
  hash.on('readable', () => {
    const data = hash.read();
    if (!data) return;
    cb(null, [data.toString('hex'), Buffer.concat(bufs)]);
  });
  stream.pipe(hash);
  stream.on('data', d => bufs.push(d));
}

exports.handler = argv => {
  let attestedFilename = getAbsolute(argv.attestedfile);
  let attestationFilename = argv.attestationfile ?
                            getAbsolute(argv.attestationfile) :
                            (attestedFilename ? attestedFilename + '.signet' : undefined);
  console.log(attestedFilename, attestationFilename);
  let attestedFileData;
  let attestationData;
  const keyFile = require('../lib/config').keyringFile;

  if (!process.stdin.isTTY) {
    // piped attestedFile, fetch attestationData. ignore passed-in filenames.
    getHashAndData(process.stdin, (err, [shasum, data]) => {
      if (err) throw err;
      attestedFileData = data;
      serverGet(`sha256:${shasum}`, (err, resData) => {
        if (err) throw err;
        attestationData = resData;
        if (attestationData.attestations.length === 0) {
          console.error(`Could not find attestation data for sha256:${shasum}`);
          process.exitCode = 1;
          return;
        }
        verify(attestationData.attestations, shasum, keyFile, verifyHandler);
      });
    });
  } else if (attestationFilename) {
    // given attestedFile, given attestationData
    attestationData = requireJSON(attestationFilename);
    verify(
      attestationData.attestations,
      fs.createReadStream(attestedFilename),
      keyFile,
      verifyHandler
    );
  } else {
    console.error('`sig verify` without filenames only supported when piped to');
    process.exitCode = 1;
    return;
  }

  function verifyHandler(err, results) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    }
    const log = process.stdout.isTTY ? console.log : console.error;
    log('File matches shasum', attestationData.attestations[0].data.id);
    results.forEach((result, i) => {
      const key = attestationData.attestations[i].key;
      if (result.unknownKey) {
        log('This attestation is signed with an unknown key:', key);
        log('You\'ll need to import it into your keychain.');
        process.exitCode = 1;
      } else {
        log('This attestation is signed with keyid:', key);
        log('This file is verified, with the following data:');
      }
      log(JSON.stringify(attestationData, null, 4));
    });
    if (!process.stdout.isTTY) {
      process.stdout.write(attestedFileData);
    }
  }
};
