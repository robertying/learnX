import { transformSync } from '@babel/core';

/**
 * helpers/env as each build gets it: babel/inline-env.js puts the allowed .env
 * values in place of its placeholder. The .env read here is a stand-in.
 */

const inlineEnv = require('../../../babel/inline-env');

// Node's own modules, typed as far as used here (the app's types leave Node out)
declare const __dirname: string;
type Read = (p: string, ...rest: unknown[]) => string;
const fs: {
  existsSync: (p: string) => boolean;
  readFileSync: Read;
} = require('fs');
const path: { join: (...parts: string[]) => string } = require('path');

const dotenv = {
  DUMMY_USERNAME: 'mock-user',
  COURSEX_REFRESH_TOKEN: 'token-✓',
  LIVE_USERNAME: 'live',
  SECRET: 'not listed',
};

const envSource = fs.readFileSync(path.join(__dirname, '..', 'env.ts'), 'utf8');

/** Builds helpers/env for a Babel env, and loads it. */
const build = (babelEnv: 'development' | 'production') => {
  const { code } = transformSync(envSource, {
    filename: 'env.ts',
    babelrc: false,
    configFile: false,
    envName: babelEnv,
    presets: ['@babel/preset-typescript'],
    plugins: [inlineEnv, '@babel/plugin-transform-modules-commonjs'],
  })!;
  const module = { exports: {} as Record<string, any> };
  // oxlint-disable-next-line no-new-func, typescript/no-implied-eval -- loads the built module
  new Function('module', 'exports', code!)(module, module.exports);
  return { code: code!, env: module.exports };
};

beforeEach(() => {
  const real = { existsSync: fs.existsSync, readFileSync: fs.readFileSync };
  jest
    .spyOn(fs, 'existsSync')
    .mockImplementation(p =>
      String(p).endsWith('.env') ? true : real.existsSync(p),
    );
  jest.spyOn(fs, 'readFileSync').mockImplementation(((
    p: string,
    ...rest: unknown[]
  ) =>
    String(p).endsWith('.env')
      ? Object.entries(dotenv)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n')
      : real.readFileSync(p, ...rest)) as typeof fs.readFileSync);
});
afterEach(() => jest.restoreAllMocks());

it('ships the mock logins, and only the listed keys', () => {
  const { env } = build('production');
  expect(env.default).toEqual({ DUMMY_USERNAME: 'mock-user' });
});

it('keeps live test logins out of release builds', () => {
  expect(build('development').env.default).toEqual({
    DUMMY_USERNAME: 'mock-user',
    LIVE_USERNAME: 'live',
  });
});

it('masks the courseX token in the bundle and unmasks it on use', () => {
  const { code, env } = build('production');
  expect(code).not.toContain('token-');
  expect(env.getCourseXRefreshToken()).toBe('token-✓');
});

it('has no token without one in .env', () => {
  jest.mocked(fs.existsSync).mockReturnValue(false);
  const { env } = build('production');
  expect(env.default).toEqual({});
  expect(env.getCourseXRefreshToken()).toBeUndefined();
});

it("loads as Jest builds it, with this checkout's .env or none", () => {
  jest.restoreAllMocks();
  const actual =
    jest.requireActual<typeof import('helpers/env')>('helpers/env');
  expect(typeof actual.default).toBe('object');
  expect(['string', 'undefined']).toContain(
    typeof actual.getCourseXRefreshToken(),
  );
});
