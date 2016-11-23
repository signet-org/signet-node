const fs = require('fs');
const path = require('path');
const configDir = path.join(require('os').homedir(), '.signet');

const configFile = path.join(configDir, 'config.json');

exports.keyringFile = path.join(configDir, 'keyring.gpg');

if (fs.existsSync(configFile)) {
  Object.assign(exports, require(configFile));
} else {
  if (process._signet_setup) {
    module.exports = {};
  } else {
    throw new Error('please run `sig setup` before proceeding');
  }
}

module.exports.configDir = configDir;
module.exports.configFile = configFile;
