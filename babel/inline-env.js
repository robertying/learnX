// Replaces the `__LEARNX_ENV__` placeholder in src/helpers/env.ts with values
// from the repo-root .env, at build time. Only listed keys reach the bundle:
// - PUBLIC_KEYS: shipped as plain strings (the mock login). The fastlane
//   build lanes fail if a release bundle contains any other .env value.
// - TEST_LOGIN=1 in the build's environment (set by scripts/e2e-build.sh for
//   every E2E build) adds `TEST_LOGIN: true`, no .env value: that build takes a
//   test login from launch arguments (services/launchOptions.ts) and says why a
//   login failed, so E2E runs need no secret in any bundle. The fastlane build
//   lanes refuse to run with it set.
// Every other key in .env is left out, including the live test login
// (`LIVE_*`), which scripts/e2e.sh passes as launch arguments instead.
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '..', '.env');
const PLACEHOLDER = '__LEARNX_ENV__';
const PUBLIC_KEYS = ['DUMMY_USERNAME', 'DUMMY_PASSWORD'];

const readEnv = () =>
  fs.existsSync(ENV_FILE) ? dotenv.parse(fs.readFileSync(ENV_FILE)) : {};

const buildEnv = (testLogin = false) => {
  const parsed = readEnv();
  const env = {};
  for (const key of PUBLIC_KEYS) {
    if (parsed[key]) env[key] = parsed[key];
  }
  if (testLogin) env.TEST_LOGIN = true;
  return env;
};

function inlineEnv(api) {
  const testLogin = api.cache.using(() => process.env.TEST_LOGIN === '1');
  const t = api.types;

  return {
    name: 'learnx-inline-env',
    visitor: {
      Identifier(p) {
        if (p.node.name !== PLACEHOLDER || !p.isReferencedIdentifier()) return;
        p.replaceWith(t.valueToNode(buildEnv(testLogin)));
      },
    },
  };
}

inlineEnv.buildEnv = buildEnv;
module.exports = inlineEnv;
