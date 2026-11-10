// Replaces the `__LEARNX_ENV__` placeholder in src/helpers/env.ts with values
// from the repo-root .env, at build time. Only listed keys reach the bundle:
// - PUBLIC_KEYS: shipped as plain strings (the mock logins).
// - MASKED_KEYS: shipped XOR'd with a key made per build, so the value doesn't
//   show up in `strings` or a grep of the bundle. The app unmasks it when it
//   needs it. This hides the value; it doesn't protect it.
// - `LIVE_*`: debug and test builds only (live test logins). Release bundles
//   are transformed with Babel env "production" and never get them; the
//   fastlane build lanes also fail if a release bundle contains a .env value
//   that shouldn't be there.
// Every other key in .env is left out.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '..', '.env');
const PLACEHOLDER = '__LEARNX_ENV__';
const PUBLIC_KEYS = [
  'DUMMY_USERNAME',
  'DUMMY_PASSWORD',
  'DUMMY_PERSIST_USERNAME',
  'DUMMY_PERSIST_PASSWORD',
];
const MASKED_KEYS = ['COURSEX_REFRESH_TOKEN'];
const DEV_KEY = /^LIVE_[A-Z0-9_]+$/;
const DEV_ENVS = new Set(['development', 'test']);

const readEnv = () =>
  fs.existsSync(ENV_FILE) ? dotenv.parse(fs.readFileSync(ENV_FILE)) : {};

// UTF-16 code units XOR'd with random 16-bit numbers.
const mask = value => {
  const codes = Array.from({ length: value.length }, (_, i) =>
    value.charCodeAt(i),
  );
  const key = codes.map(() => crypto.randomInt(0x10000));
  // oxlint-disable-next-line no-bitwise
  return { key, data: codes.map((c, i) => c ^ key[i]) };
};

const buildEnv = includeDev => {
  const parsed = readEnv();
  const env = {};
  for (const key of PUBLIC_KEYS) {
    if (parsed[key]) env[key] = parsed[key];
  }
  for (const key of MASKED_KEYS) {
    if (parsed[key]) env[key] = mask(parsed[key]);
  }
  if (includeDev) {
    for (const [key, value] of Object.entries(parsed)) {
      if (DEV_KEY.test(key) && value) env[key] = value;
    }
  }
  return env;
};

module.exports = function inlineEnv(api) {
  // Also makes Babel cache this plugin's config per env name.
  const includeDev = DEV_ENVS.has(api.env());
  const t = api.types;

  return {
    name: 'learnx-inline-env',
    visitor: {
      Identifier(p) {
        if (p.node.name !== PLACEHOLDER || !p.isReferencedIdentifier()) return;
        p.replaceWith(t.valueToNode(buildEnv(includeDev)));
      },
    },
  };
};

module.exports.buildEnv = buildEnv;
