// @preval

const fs = require('fs');
const path = require('path');

const basePath = process.cwd().includes('ios')
  ? path.resolve(process.cwd(), '../src/helpers/preval')
  : path.resolve(process.cwd(), './src/helpers/preval');

module.exports = fs.readFileSync(path.resolve(basePath, 'sso.js'), 'utf8');
