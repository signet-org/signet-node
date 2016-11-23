const path = require('path');
const fs = require('fs');
const verify = require('../lib/verify');

exports.command = 'verify <attestationfile> <attestedfile>';

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

  verify(attestationData, attestedFileStream, require('../lib/config').keyringFile, (err, result) => {
    if (err) throw err;
    console.log('File matches shasum', attestationData.data.id);
    if (result.unknownKey) {
      console.log(`This attestation is signed with an unknown key: ${attestationData.key}`);
      console.log('You\'ll need to import it into your keychain.');
      process.exitCode = 1;
    } else {
      console.log('This attestation is signed with keyid:', attestationData.key);
      console.log('This file is verified, with the following data:');
    }
    console.log(JSON.stringify(attestationData.data, null, 4));
  });
};
