const path = require('path');
const fs = require('fs');
const verify = require('../lib/verify');

exports.command = 'verify <attestedfile> <attestationfile>';

exports.describe = 'verify an attestation file';

exports.handler = argv => {
  let attestationFilename = argv.attestationfile;
  let attestedFilename = argv.attestedfile;

  if (!path.isAbsolute(attestationFilename)) {
    attestationFilename = path.resolve(process.cwd(), attestationFilename);
  }
  if (!path.isAbsolute(attestedFilename)) {
    attestedFilename = path.resolve(process.cwd(), attestedFilename);
  }

  const attestationData = JSON.parse(fs.readFileSync(attestationFilename, 'utf8'));
  const attestedFileStream = fs.createReadStream(attestedFilename);
  const keyFile = require('../lib/config').keyringFile

  verify(attestationData.attestations, attestedFileStream, keyFile, (err, results) => {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    }
    console.log('File matches shasum', attestationData.attestations[0].data.id);
    results.forEach((result, i) => {
      if (result.unknownKey) {
        console.log(`This attestation is signed with an unknown key: ${attestationData.attestations[i].key}`);
        console.log('You\'ll need to import it into your keychain.');
        process.exitCode = 1;
      } else {
        console.log('This attestation is signed with keyid:', attestationData.attestations[i].key);
        console.log('This file is verified, with the following data:');
      }
      console.log(JSON.stringify(attestationData, null, 4));
    });
  });
};
