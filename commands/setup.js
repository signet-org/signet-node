const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
exports.command = 'setup <keyid>';
exports.describe = 'set up signet with a keyid';
exports.handler = argv => {
  process._signet_setup = true;
  const config = require('../lib/config');
  delete process._signet_setup;
  if (!fs.existsSync(config.configDir)) {
    fs.mkdirSync(config.configDir);
    console.log('Initialized config directory at:', config.configDir);
  }
  const newConfigData = {
    keyid: argv.keyid // TODO check if valid key, use full fingerprint
  };
  const configData = fs.existsSync(config.configFile) ?
    Object.assign(require(config.configFile), newConfigData) :
    newConfigData;
  if (!configData.server) {
    configData.server = 'https://sig.network';
  }
  fs.writeFileSync(config.configFile, JSON.stringify(configData));
  console.log('Initialized config file at:', config.configFile);
  console.log('With public key id:', argv.keyid);
};
