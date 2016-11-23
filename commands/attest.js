const path = require('path');
const fs = require('fs');

const attest = require('../lib/attest');

exports.command = 'attest <file>';

exports.describe = 'make an attestation file';

exports.handler = argv => {
  let filename = argv.file;
  if (!path.isAbsolute(filename)) {
    filename = path.resolve(process.cwd(), filename);
  }

  if (!fs.existsSync(filename)) {
    throw new Error(`File ${filename} does not exist`);
  }

  attest(fs.createReadStream(filename), require('../lib/config').keyid, (err, attestation) => {
    fs.writeFileSync(filename+'.signet', JSON.stringify(attestation, null, 4));
    console.log('Saved attestation for:', filename);
    console.log('                   at:', filename+'.signet');
    console.log(JSON.stringify(attestation.data, null, 4));
  });
};
