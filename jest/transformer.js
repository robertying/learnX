// babel-jest for src/helpers/preval/*.preval.js (jest.config.js), with a
// longer cache key. Those files run at transform time (babel-plugin-preval)
// and read other files (sso.js, darkMode.js, KaTeX), which babel-jest's key
// doesn't cover, so Jest would keep serving their old output. The key here
// also covers the preval folder and the installed KaTeX, as metro.config.js
// does for Metro.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createTransformer } = require('babel-jest').default;

const prevalDir = path.join(__dirname, '../src/helpers/preval');

const prevalInputsHash = () => {
  const hash = crypto.createHash('sha256');
  for (const name of fs.readdirSync(prevalDir).sort()) {
    hash.update(name);
    hash.update(fs.readFileSync(path.join(prevalDir, name)));
  }
  hash.update(require('katex/package.json').version);
  return hash.digest('hex');
};

const babelJest = createTransformer();

module.exports = {
  ...babelJest,
  getCacheKey(sourceText, sourcePath, options) {
    return `${babelJest.getCacheKey(sourceText, sourcePath, options)}-${prevalInputsHash()}`;
  },
};
