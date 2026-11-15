#!/usr/bin/env node
// Fails unless each release JS bundle given has the mock login from the
// repo-root .env in it, and none of the other .env values as is:
// babel/inline-env.js inlines only the mock login (DUMMY_*), so any other
// value in a bundle is a leak. A bundle without the mock login was built from
// a cached transform of helpers/env.ts or another .env.
//
//   node scripts/check-bundle-env.mjs <bundle>...
//
// scripts/check-release-bundle.sh (CI) and fastlane's build lanes run it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';

const MOCK_LOGIN = ['DUMMY_USERNAME', 'DUMMY_PASSWORD'];

/**
 * What's wrong with a bundle, given the .env values: one message per problem,
 * none when it passes. Read as bytes: a Hermes bundle is bytecode, whose
 * string table holds the values as they are.
 * @param {Buffer} code
 * @param {Record<string, string>} env
 * @returns {string[]}
 */
export const bundleProblems = (code, env) => {
  const problems = [];
  const absent = MOCK_LOGIN.filter(
    key => !env[key] || !code.includes(env[key]),
  );
  if (absent.length) {
    problems.push(
      `doesn't contain the .env value of ${absent.join(', ')}: the mock login wasn't inlined (babel/inline-env.js)`,
    );
  }
  // Values shorter than 4 characters would match by chance.
  const leaked = Object.entries(env)
    .filter(([key, value]) => !key.startsWith('DUMMY_') && value.length >= 4)
    .filter(([, value]) => code.includes(value))
    .map(([key]) => key);
  if (leaked.length) {
    problems.push(
      `contains the .env value of ${leaked.join(', ')}, which release bundles must not include (babel/inline-env.js)`,
    );
  }
  return problems;
};

const main = () => {
  const bundles = process.argv.slice(2);
  if (!bundles.length) {
    console.error('usage: node scripts/check-bundle-env.mjs <bundle>...');
    process.exit(1);
  }
  const env = dotenv.parse(
    readFileSync(join(import.meta.dirname, '..', '.env')),
  );
  let failed = false;
  for (const bundle of bundles) {
    for (const problem of bundleProblems(readFileSync(bundle), env)) {
      console.error(`${bundle} ${problem}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`No .env secrets in ${bundles.length} release bundle(s)`);
};

if (process.argv[1] === import.meta.filename) {
  main();
}
