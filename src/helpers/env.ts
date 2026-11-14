// Values from the repo-root .env, inlined at build time by
// babel/inline-env.js. See that file for which keys reach which builds.

type InlinedEnv = {
  DUMMY_USERNAME?: string;
  DUMMY_PASSWORD?: string;
  /**
   * A build for E2E runs (TEST_LOGIN=1, scripts/e2e-build.sh): it takes a test
   * login from launch arguments and says why a login failed. Never set in a
   * shipped build.
   */
  TEST_LOGIN?: boolean;
} & {
  /** Live test logins. Debug builds only; always undefined in release. */
  [key: `LIVE_${string}`]: string | undefined;
};

declare const __LEARNX_ENV__: InlinedEnv;

const env = __LEARNX_ENV__;

export default env;
