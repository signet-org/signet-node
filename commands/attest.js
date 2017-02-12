const path = require('path');
const fs = require('fs');

const attest = require('../lib/attest');

exports.command = 'attest <file>';

exports.describe = 'make an attestation';

exports.handler = argv => {
  let filename = argv.file;
  if (!path.isAbsolute(filename)) {
    filename = path.resolve(process.cwd(), filename);
  }

  if (!fs.existsSync(filename)) {
    throw new Error(`File ${filename} does not exist`);
  }

  const keyId = require('../lib/config').keyid;
  attest(fs.createReadStream(filename), keyId, (err, result) => {
    let attestations = [];
    if (fs.existsSync(filename+'.signet')) {
      const existingData = fs.readFileSync(filename.signet, 'utf8');
      attestations = JSON.stringify(existingData).attestations;
      // TODO avoid double-attesting (or allow it, timestamped?)
    }
    attestations.push(result);
    const outObj = {attestations};
    fs.writeFileSync(filename+'.signet', JSON.stringify(outObj, null, 4));
    console.log('Saved attestation for:', filename);
    console.log('                   at:', filename+'.signet');
    console.log(JSON.stringify(outObj, null, 4));
  });
};
