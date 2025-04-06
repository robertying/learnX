// @preval

const readFiles = require('./readFile.js');
const packageJson = require('../../../package.json');

const katexVersion = packageJson.dependencies.katex;

const CDN_URL = `https://fastly.jsdelivr.net/npm/katex@${katexVersion}/dist/fonts/`;

let cssFileContent = readFiles(['katex/dist/katex.min.css']);
cssFileContent = cssFileContent.replaceAll('url(fonts/', `url(${CDN_URL}`);

module.exports = cssFileContent;
