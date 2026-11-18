// babel/inline-platform.js, run with only itself (babel-preset-expo inlines
// `process.env.EXPO_OS` and Metro folds the result in a real build;
// scripts/checks/check-release-bundle.sh checks that end to end).
import path from 'node:path';
import { transformSync } from '@babel/core';
import inlinePlatform from '../../babel/inline-platform';

const root = path.join(__dirname, '..', '..');

const transform = (
  code: string,
  {
    filename = path.join(root, 'src', 'screens', 'Example.ts'),
    caller = 'metro',
  } = {},
) =>
  transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    caller: { name: caller },
    plugins: [inlinePlatform],
  })?.code;

it('turns the helpers’ calls into checks Metro folds', () => {
  expect(
    transform(
      [
        "import { isAndroid, isApple, isElectron } from 'helpers/platform';",
        "const a = isApple() ? require('./A') : isAndroid() ? 1 : 2;",
        'if (!isElectron()) {}',
      ].join('\n'),
    ),
  ).toBe(
    [
      `const a = process.env.EXPO_OS === "ios" ? require('./A') : process.env.EXPO_OS === "android" ? 1 : 2;`,
      `if (!(process.env.EXPO_OS === "web")) {}`,
    ].join('\n'),
  );
});

it('finds the module by a relative path too', () => {
  expect(
    transform(
      "import { isApple as apple } from '../helpers/platform';\napple();",
    ),
  ).toBe(`process.env.EXPO_OS === "ios";`);
  expect(
    transform("import { isApple } from './platform';\nisApple();", {
      filename: path.join(root, 'src', 'helpers', 'other.ts'),
    }),
  ).toBe(`process.env.EXPO_OS === "ios";`);
});

it('keeps an import still used as a value', () => {
  expect(
    transform(
      "import { isApple } from 'helpers/platform';\nisApple();\nconst f = isApple;",
    ),
  ).toBe(
    `import { isApple } from 'helpers/platform';\nprocess.env.EXPO_OS === "ios";\nconst f = isApple;`,
  );
});

it('leaves other modules and other callers alone', () => {
  const other = "import { isApple } from 'helpers/other';\nisApple();";
  expect(transform(other)).toBe(other);
  const platform = "import { isApple } from 'helpers/platform';\nisApple();";
  // Jest keeps the real helpers, which tests switch with Platform.OS.
  expect(transform(platform, { caller: 'babel-jest' })).toBe(platform);
});
