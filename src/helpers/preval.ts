declare const preval: any;

export const darkreader = preval`
    const fs = require('fs')
    module.exports = fs.readFileSync(require.resolve('../../node_modules/darkreader/darkreader.js'), 'utf8')
`;
