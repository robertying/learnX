const fs = require('fs');

/** Reads files from installed packages (`katex/dist/katex.min.js`) and joins them. */
function readFiles(filePaths) {
  return filePaths
    .map(filePath => fs.readFileSync(require.resolve(filePath), 'utf8'))
    .join('\n');
}

module.exports = readFiles;
