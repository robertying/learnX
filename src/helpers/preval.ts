declare const preval: any;

export const darkreader = preval`
    const fs = require('fs');
    const path = require('path');
    module.exports = fs.readFileSync(path.resolve(process.cwd(), '../node_modules/darkreader/darkreader.js'), 'utf8')
`;
