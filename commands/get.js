const serverGet = require('../lib/server-get');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.command = 'get <file>';

exports.describe = 'get attestations for <file> from server';

exports.handler = argv => {
  let filename = argv.file;
  if (!path.isAbsolute(filename)) {
    filename = path.resolve(process.cwd(), filename);
  }

  if (!fs.existsSync(filename)) {
    throw new Error(`File ${filename} does not exist`);
  }

  const hash = crypto.createHash('sha256');
  hash.on('readable', () => {
    const data = hash.read();
    if (!data) {
      return;
    }
    const shasum = data.toString('hex');
    const id = `sha256:${shasum}`;
    serverGet(`sha256:${shasum}`, (err, result) => {
      let existingAttestations = [];
      if (fs.existsSync(filename+'.signet')) {
        const existingData = fs.readFileSync(filename + '.signet', 'utf8');
        existingAttestations = JSON.parse(existingData).attestations;
      }
      result.attestations.forEach(a => {
        let alreadyHas = false;
        existingAttestations.forEach(e => {
          if (a.sig === e.sig) {
            alreadHas = true;
          }
        });
        if (!alreadyHas) {
          existingAttestations.push(a);
        }
      });
      const outObj = {attestations: existingAttestations};
      fs.writeFileSync(filename+'.signet', JSON.stringify(outObj, null, 4));
      console.log('Saved attestations for:', filename);
      console.log('                    at:', filename+'.signet');
      console.log(JSON.stringify(outObj, null, 4));

    });
  });
  fs.createReadStream(filename).pipe(hash);

};
