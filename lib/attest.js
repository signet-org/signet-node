const crypto = require('crypto');
const child_process = require('child_process');
const inquirer = require('inquirer');

function sortKeys(obj) {
  const newObj = {};
  Reflect.ownKeys(obj).sort().forEach(k => newObj[k] = obj[k]);
  return newObj;
}

const attestPrompt = [
  {type: 'confirm', name: 'reviewed', message: 'I have reviewed this file:'},
  {type: 'confirm', name: 'ok', message: 'It performs as expected and is free of major flaws:'},
  {type: 'input', name: 'comment', message: 'Comment:'}
];



module.exports = attest;

function attest(fileStreamOrShasum, keyid, cb) {
  if (typeof fileStreamOrShasum === 'string') {
    return attestShasum(fileStreamOrShasum, keyid, cb);
  }
  const hash = crypto.createHash('sha256')
  hash.on('readable', () => {
    const data = hash.read();
    if (!data) return;
    attestShasum(data.toString('hex'), keyid, cb);
  });
  fileStreamOrShasum.pipe(hash);
}

function attestShasum(shasum, keyid, cb) {
  inquirer.prompt(attestPrompt).then(sigData => {
    sigData.id = `sha256:${shasum}`;
    sigData = sortKeys(sigData);
    gpgSign(sigData, keyid, (err, signature) => {
      if (err) return cb(err);
      gpgGetFingerprint(keyid, (err, fingerprint) => {
        if (err) return cb(err);
        const attestation = {
          data: sigData,
          key: fingerprint,
          sig: signature.toString('base64')
        };
        cb(null, attestation);
      });
    });
  });
}

function gpgGetFingerprint(keyid, cb) {
  child_process.exec(`gpg --fingerprint ${keyid}`, (err, keydata, stderr) => {
    cb(null, keydata
      .split(/\n/)
      .filter(l => /^      /.test(l))[0]
      .replace(/ /g, '')
    );
  });
}

function gpgSign(sigData, keyid, cb) {
  const gpgArgs = [
    '--detach-sign',
    '--digest-algo=sha256',
    '-u',
    keyid,
    '-o',
    '-'
  ];
  const proc = child_process.spawn('gpg', gpgArgs);
  const stdoutBuffers = [];
  proc.stdout.on('data', d => stdoutBuffers.push(d));
  proc.stdout.on('end', () => {
    cb(null, Buffer.concat(stdoutBuffers));
  });
  proc.stdin.write(JSON.stringify(sigData));
  proc.stdin.end();
}
