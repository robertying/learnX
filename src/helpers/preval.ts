declare const preval: any;

export const darkreader = preval`
    const fs = require('fs');
    const path = require('path');
    let str;
    if (process.cwd().includes("ios")) {
      str = fs.readFileSync(path.resolve(process.cwd(), '../node_modules/darkreader/darkreader.js'), 'utf8');
    } else {
      str = fs.readFileSync(path.resolve(process.cwd(), './node_modules/darkreader/darkreader.js'), 'utf8');
    }
    module.exports = str
`;
