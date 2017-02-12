#!/usr/bin/env node
process.on('unhandledRejection', console.error);

require('yargs').commandDir('./commands').demand(1).help().argv;
