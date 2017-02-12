const serverPut = require('../lib/server-put');
const fs = require('fs');

exports.command = 'put <file>';

exports.describe = 'upload attestations for <file> to server';

exports.handler = argv => {
  let filename = argv.file;
  if (!path.isAbsolute(filename)) {
    filename = path.resolve(process.cwd(), filename);
  }
  if (!fs.existsSync(filename+'.signet')) {
    throw new Error(`File ${filename}.signet does not exist`);
  }

  const data = JSON.parse(fs.readFileSync(filename+'.signet', 'utf8'));
  serverPut(data, err => {
    if (err) throw err;

    console.log(`Attestations for ${filename} sent to server.`);
  });
};
