// Jest's transform of the Electron app's preloads (electron/*.cts): what
// ships, the source with its types stripped by Node (electron/preloads.ts),
// rather than Babel's take on it (babel-preset-expo reads .cts as Flow).
// Jest adds its coverage counters to the result, and caches the result with
// them, so the key tells a run with coverage from one without: Jest leaves
// `instrument` out of a key a transform makes, and a `pnpm test` run would
// otherwise hand the next `pnpm test --coverage` preloads with no counters.
const crypto = require('crypto');
const { stripTypeScriptTypes } = require('module');

/** @type {import('@jest/transform').SyncTransformer} */
module.exports = {
  canInstrument: false,
  getCacheKey: (sourceText, sourcePath, { instrument }) =>
    crypto
      .createHash('sha256')
      .update(process.version)
      .update(instrument ? 'instrument' : '')
      .update(sourcePath)
      .update(sourceText)
      .digest('hex'),
  process: sourceText => {
    // Node warns once that the function is experimental (preloads.ts).
    const { emitWarning } = process;
    process.emitWarning = () => {};
    try {
      return { code: stripTypeScriptTypes(sourceText, { mode: 'strip' }) };
    } finally {
      process.emitWarning = emitWarning;
    }
  },
};
