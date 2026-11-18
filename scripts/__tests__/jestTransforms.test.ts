// The repo's own Jest transforms (jest/).
const stripTypes = require('../../jest/stripTypes.js') as {
  getCacheKey: (
    sourceText: string,
    sourcePath: string,
    options: { instrument: boolean },
  ) => string;
};

it("keeps the preloads' output with coverage counters apart from the one without", () => {
  // Jest caches the instrumented output under the transform's own key.
  const key = (instrument: boolean) =>
    stripTypes.getCacheKey('const a: number = 1;', '/preload.cts', {
      instrument,
    });
  expect(key(true)).not.toBe(key(false));
  expect(key(true)).toBe(key(true));
});
