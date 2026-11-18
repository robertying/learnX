// Exports the app's web build (`expo export --platform web`) for Electron,
// for the dev runner (dev.ts) and packaging (package.ts). Expo's CLI runs
// in this Node rather than through `pnpm exec`: on Windows pnpm is a .cmd
// script, which Node only starts through a shell.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'package.json'));

/** Exports the web build to `webDir`, or exits with the export's status. */
export const exportWeb = (webDir: string): void => {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('expo/bin/cli'),
      'export',
      '--platform',
      'web',
      '--output-dir',
      webDir,
    ],
    { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1' } },
  );
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
