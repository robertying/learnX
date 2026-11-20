// Exports the app's web build (`expo export --platform web`) for Electron,
// for the dev runner (dev.ts), packaging (package.ts) and CI
// (`node electron/webExport.ts <dir>`). Expo's CLI runs in this Node rather
// than through `pnpm exec`: on Windows pnpm is a .cmd script, which Node only
// starts through a shell.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'package.json'));

/**
 * Expo's tree shaking, for the web build only: Metro bundles every module a
 * file imports, and Fluent UI's components come from one index of the whole
 * library, each icon module holds every size of its icon, and so on, so
 * without it half the bundle is code the app never runs (7.8 MB, 4.4 MB with
 * it). It needs the graph optimization it builds on, and React Compiler's
 * output to be cloneable to Metro's workers
 * (patches/babel-plugin-react-compiler). The mobile bundles and updates
 * leave it off.
 */
export const TREE_SHAKING_ENV = {
  EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH: '1',
  EXPO_UNSTABLE_TREE_SHAKING: '1',
};

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
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, CI: '1', ...TREE_SHAKING_ENV },
    },
  );
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (import.meta.main) {
  const [webDir] = process.argv.slice(2);
  if (!webDir) {
    console.error('usage: node electron/webExport.ts <output dir>');
    process.exit(1);
  }
  exportWeb(path.resolve(webDir));
}
