// What learnX's Electron dev runs leave on a Mac, by name: what clean.ts
// (`pnpm electron:clean`) removes.
import path from 'node:path';
import { APP_ID, APP_NAME } from './macDevApp.ts';

/**
 * learnX's dev app's id. Not the stock Electron.app's, com.github.Electron,
 * which every unpackaged Electron app on this Mac shares: dev runs open
 * learnX.app (macDevApp.ts), never it.
 */
export const IDS = [APP_ID];
/** Never removed, whatever the patterns say: the Mac Catalyst app's id. */
const CATALYST_ID = 'io.robertying.learnX';

/** Whether a name under ~/Library belongs to a dev run. */
export const isDevRunName = (name: string): boolean => {
  const base = name.replace(/\.plist$/, '');
  if (base === CATALYST_ID || base.startsWith(`${CATALYST_ID}.`)) {
    return false;
  }
  return (
    name === APP_NAME ||
    IDS.some(id => base === id || base.startsWith(`${id}.`))
  );
};

/**
 * Paths in LaunchServices' dump (`lsregister -dump`) that a dev run from
 * `root` registered: its learnX.app, and Electron.app in its node_modules.
 */
export const devRunRegistrations = (dump: string, root: string): string[] => {
  const paths = new Set<string>();

  for (const line of dump.split('\n')) {
    const match = /^path:\s+(.*?)(?: \(0x[0-9a-f]+\))?$/.exec(line);
    const registered = match?.[1];
    if (
      registered?.startsWith(root + path.sep) &&
      (registered.endsWith(`/build/electron/${APP_NAME}.app`) ||
        /\/node_modules\/(?:.*\/)?electron\/dist\/Electron\.app$/.test(
          registered,
        ))
    ) {
      paths.add(registered);
    }
  }
  return [...paths];
};
