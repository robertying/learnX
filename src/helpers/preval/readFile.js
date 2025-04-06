const fs = require('fs');
const path = require('path');

const basePath = process.cwd().includes('ios')
  ? path.resolve(process.cwd(), '../node_modules')
  : path.resolve(process.cwd(), './node_modules');

function readFiles(filePaths) {
  return filePaths
    .map(filePath => {
      return fs.readFileSync(path.resolve(basePath, filePath), 'utf8');
    })
    .join('\n');
}

module.exports = readFiles;
