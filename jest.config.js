// Fixed time zone so date formatting is the same on every machine
process.env.TZ = 'Asia/Shanghai';

// Tests that make commits in temporary repos (changedFiles.test.ts) leave
// them unsigned, whatever the machine's Git config says, so a signing setup
// (1Password, a hardware key) doesn't prompt during a run. Workers and the
// Git processes they start inherit this.
{
  const count = Number(process.env.GIT_CONFIG_COUNT) || 0;
  ['commit.gpgsign', 'tag.gpgsign'].forEach((key, i) => {
    process.env[`GIT_CONFIG_KEY_${count + i}`] = key;
    process.env[`GIT_CONFIG_VALUE_${count + i}`] = 'false';
  });
  process.env.GIT_CONFIG_COUNT = String(count + 2);
}

/** @type {import('jest').Config} */
const base = {
  preset: '@react-native/jest-preset',
  // patches/__tests__ test what the patches in patches/ change.
  roots: ['<rootDir>/src', '<rootDir>/patches'],
  // Loads Reanimated's and Worklets' web builds instead of the native ones
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupAfterEnv.ts'],
  // Every test starts with fresh call records on every mock, and spies and
  // replaced properties (jest.replaceProperty(Platform, 'OS', 'android'))
  // go back to the real thing.
  clearMocks: true,
  restoreMocks: true,
  transform: {
    // Before the preset's babel-jest: a cache key that covers the files these
    // read at transform time
    '/src/helpers/preval/[^/]+\\.preval\\.js$': '<rootDir>/jest/transformer.js',
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // React Native libraries (react-native-*, @react-native-*), React
    // Navigation, thu-learn-lib (and some of its dependencies) and mime ship
    // ESM or untranspiled source, so they go through Babel (entities is nested
    // under thu-learn-lib, newer and ESM-only; he resolves to its .mjs build).
    // @expo/ui is replaced by stand-ins, but its patch test loads the real one.
    'node_modules/(?!((jest-)?react-native[^/]*|@react-native[^/]*|@react-navigation|@robertying/thu-learn-lib|@expo/ui|node-fetch-native|fetch-cookie|entities|mime|he)/)',
  ],
};

// The Electron app's packages with no web build resolve to the stand-ins
// src/web/aliases.json names (as metro.config.js does on web).
const webAliases = Object.fromEntries(
  Object.entries(require('./src/web/aliases.json')).map(([name, file]) => [
    `^${name.replace(/[/.]/g, '\\$&')}$`,
    `<rootDir>/src/web/${file}`,
  ]),
);

/**
 * One project per platform, each resolving that platform's files (iOS is
 * Jest's default platform here; Android's and the Electron app's tests live in
 * `__tests__/android` and `__tests__/web`), and `tooling` for the repo's own
 * scripts and the Electron main process, typed with Node.
 */
// Node's own localStorage (on by default since Node 25) warns in every worker
// whose environment reads the globals (Jest copies them), and the tests use
// jsdom's or none: the workers start without it.
if (!process.env.NODE_OPTIONS?.includes('--no-experimental-webstorage')) {
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    '--no-experimental-webstorage',
  ]
    .filter(Boolean)
    .join(' ');
}

/** @type {import('jest').Config} */
module.exports = {
  // Count every source file, not only the ones some test imports.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Browser scripts the web views run (helpers/html inlines them), loaded
    // as modules by their tests. sso.js and ssoAlerts.js are run as text
    // (a template, and a script whose result the web view reads), so their
    // tests can't count them.
    'src/helpers/preval/{csrfLinks,darkMode}.js',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    // Widget layouts and their kit become source text at build time ('widget'
    // directive), so their code never runs as itself (and counters added to
    // it would be missing where it runs); src/widgets/__tests__/layouts.test.ts
    // runs that text instead.
    '!src/widgets/{Deadlines,UpNext}{,.android}.tsx',
    '!src/widgets/kit{,.android}.tsx',
    // The Electron app's main process (the `tooling` project's tests). The
    // dev runner, its Mac app, the packaging and clean-up scripts and the
    // E2E tests' Electron download only run on a developer's machine.
    'electron/*.{ts,cts}',
    '!electron/{dev,clean,package,macDevApp,devTraces,webExport,electronApp}.ts',
    '!electron/playwright.config.ts',
  ],
  // CI runs `pnpm test --coverage` and fails below these, so coverage can't
  // slip unnoticed. Keep them just under the current numbers; raise them as
  // coverage grows.
  // The totals in the log, and a browsable report in coverage/index.html
  coverageReporters: ['text-summary', 'html'],
  coverageThreshold: {
    global: { statements: 99, branches: 95.8, functions: 97, lines: 99.2 },
  },
  projects: [
    {
      ...base,
      displayName: 'ios',
      testPathIgnorePatterns: [
        '/node_modules/',
        '/__tests__/android/',
        '/__tests__/web/',
      ],
    },
    {
      ...base,
      displayName: 'android',
      haste: {
        defaultPlatform: 'android',
        platforms: ['android', 'ios', 'native'],
      },
      setupFiles: ['<rootDir>/jest/setup.ts', '<rootDir>/jest/android.ts'],
      // Material Symbols, which Compose draws from vector drawables
      moduleNameMapper: { '\\.xml$': '<rootDir>/jest/mocks/drawable.ts' },
      testMatch: ['<rootDir>/src/**/__tests__/android/**/*.test.ts?(x)'],
    },
    {
      displayName: 'web',
      roots: ['<rootDir>/src', '<rootDir>/modules'],
      testEnvironment: 'jsdom',
      haste: { defaultPlatform: 'web', platforms: ['web'] },
      moduleNameMapper: {
        '^react-native$': 'react-native-web',
        '\\.png$': '<rootDir>/jest/mocks/image.js',
        ...webAliases,
      },
      setupFiles: ['<rootDir>/jest/web/setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest/setupAfterEnv.ts'],
      clearMocks: true,
      restoreMocks: true,
      transformIgnorePatterns: base.transformIgnorePatterns,
      testMatch: ['<rootDir>/**/__tests__/web/**/*.test.ts?(x)'],
    },
    {
      ...base,
      displayName: 'tooling',
      roots: ['<rootDir>/scripts', '<rootDir>/electron'],
      transform: {
        // The preloads: Node strips their types, as for what ships.
        '/electron/[^/]+\\.cts$': '<rootDir>/jest/stripTypes.js',
        // The rest of the Electron app runs as ES modules in Node, so its
        // tests import it as Node does: `import.meta` as there, and a
        // CommonJS module's default import its `module.exports`
        // (electron-updater's sets `__esModule`).
        '/electron/.+\\.ts$': [
          'babel-jest',
          {
            plugins: [
              './babel/jest-node-esm',
              [
                '@babel/plugin-transform-modules-commonjs',
                { importInterop: 'node' },
              ],
            ],
          },
        ],
        ...base.transform,
      },
      // Playwright's (`pnpm e2e:electron`).
      testPathIgnorePatterns: ['/node_modules/', '/electron/e2e/'],
      testEnvironment: 'node',
    },
  ],
};
