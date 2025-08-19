// @preval

const readFiles = require('./readFile.js');

module.exports = readFiles([
  'katex/dist/katex.min.js',
  'katex/dist/contrib/auto-render.min.js',
]);
