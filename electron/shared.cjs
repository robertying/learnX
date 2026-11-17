// What the main process shares with the page, kept once in src/constants:
// the file types the preview shows and that run as programs, and the web
// views' session. A dev run reads them from the checkout; a packaged app has
// them copied next to this file (packageConfig.cjs, `SHARED_FILES`).
const fs = require('node:fs');
const path = require('node:path');

/** The files, by name, in src/constants. */
const SHARED_FILES = ['electronFileTypes.json', 'webviewPartition.json'];

const packagedDir = path.join(__dirname, 'constants');
const sharedDir = fs.existsSync(packagedDir)
  ? packagedDir
  : path.join(__dirname, '..', 'src', 'constants');

/** @param {typeof SHARED_FILES[number]} name */
const readShared = name => {
  if (!SHARED_FILES.includes(name)) {
    throw new Error(`Not a shared file: ${name}`);
  }
  return JSON.parse(fs.readFileSync(path.join(sharedDir, name), 'utf8'));
};

module.exports = { SHARED_FILES, readShared };
