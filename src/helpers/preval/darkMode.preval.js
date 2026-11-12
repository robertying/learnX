// @preval

// Inlined at build time. Metro (metro.config.js) and Jest (jest/transformer.js)
// both key their caches on this folder, so edits to darkMode.js show up on the next
// run.

const fs = require('fs');
const path = require('path');

module.exports = fs.readFileSync(path.join(__dirname, 'darkMode.js'), 'utf8');
