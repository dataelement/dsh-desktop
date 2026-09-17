#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const args = require('minimist')(process.argv.slice(2), {
  boolean: [
    'help'
  ]
});
const usage = fs.readFileSync(path.join(__dirname, 'electron-osx-flat-usage.txt')).toString();
const flat = require('../').flat;

args.app = args._.shift();

if (!args.app || args.help) {
  console.log(usage);
  process.exit(0);
}

// Remove excess arguments
delete args._;
delete args.help;

flat(args, function done (err) {
  if (err) {
    console.error('Flat failed:');
    if (err.message) console.error(err.message);
    else if (err.stack) console.error(err.stack);
    else console.log(err);
    process.exit(1);
  }
  console.log('Application flattened, saved to:', args.pkg);
  process.exit(0);
});
