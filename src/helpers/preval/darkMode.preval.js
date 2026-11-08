// @preval

// Inlined at build time: after editing darkMode.js, restart Metro with
// --reset-cache to pick up the change.

const fs = require('fs');
const path = require('path');

const basePath = process.cwd().includes('ios')
  ? path.resolve(process.cwd(), '../src/helpers/preval')
  : path.resolve(process.cwd(), './src/helpers/preval');

module.exports = fs.readFileSync(path.resolve(basePath, 'darkMode.js'), 'utf8');
