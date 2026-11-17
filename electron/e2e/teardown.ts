// After the whole run: on a Mac, removes what the runs of learnX.app left on
// the system (preferences, LaunchServices' entry), as `pnpm electron:clean`
// does, but keeps the dev data folder, which the tests never used. Each
// test's own data folder is deleted by its fixture.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export default function teardown() {
  if (process.platform === 'darwin') {
    spawnSync(
      process.execPath,
      [path.join(__dirname, '..', 'clean.mjs'), '--keep-data'],
      { stdio: 'inherit' },
    );
  }
}
