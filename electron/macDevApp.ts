// The app the dev runner (dev.ts) opens on a Mac: build/electron/learnX.app,
// a copy of the downloaded Electron.app named, identified and drawn as learnX,
// so the Dock, the menu bar, Activity Monitor, LaunchServices and the
// preferences it writes say learnX, not Electron. It's renamed the way
// @electron/packager renames a packaged app, helpers included (Electron finds
// its helpers by the main executable's name), with the Mac icon compiled from
// the iOS app's icon (ios/learnX/AppIcon.icon), and signed ad hoc, since
// editing the bundle breaks Electron's signature and arm64 won't run an
// unsigned app. It's made again only when Electron or the icon changes.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const APP_NAME = 'learnX';
export const APP_ID = 'io.robertying.learnXElectron';
/** Bumped when the way the copy is made changes, so it's made again. */
const RECIPE = 2;

/** Electron's helper apps, by the suffix after "<name> Helper". */
const HELPER_SUFFIXES = ['', ' (GPU)', ' (Renderer)', ' (Plugin)'];

/**
 * What changes in the copy: the main executable and each helper app's
 * folder and executable (relative to Contents), and each Info.plist's keys.
 */
export const renames = () => ({
  executable: { from: 'MacOS/Electron', to: `MacOS/${APP_NAME}` },
  plist: {
    CFBundleName: APP_NAME,
    CFBundleDisplayName: APP_NAME,
    CFBundleExecutable: APP_NAME,
    CFBundleIdentifier: APP_ID,
    CFBundleIconFile: 'AppIcon',
    CFBundleIconName: 'AppIcon',
    // Starts as an accessory, with no Dock icon, so an E2E run never shows
    // one even for a moment; main.ts makes other dev runs regular apps.
    LSUIElement: '1',
  },
  helpers: HELPER_SUFFIXES.map(suffix => ({
    from: `Frameworks/Electron Helper${suffix}.app`,
    to: `Frameworks/${APP_NAME} Helper${suffix}.app`,
    executable: {
      from: `Electron Helper${suffix}`,
      to: `${APP_NAME} Helper${suffix}`,
    },
    plist: {
      CFBundleName: `${APP_NAME} Helper${suffix}`,
      CFBundleExecutable: `${APP_NAME} Helper${suffix}`,
      // Electron gives its four helpers one id, as packager does.
      CFBundleIdentifier: `${APP_ID}.helper`,
    },
  })),
});

/** A hash of every file in a folder, by relative path and contents. */
export const hashFolder = (dir: string): string => {
  const hash = createHash('sha256');
  const walk = (sub: string) => {
    for (const entry of fs
      .readdirSync(path.join(dir, sub), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.join(sub, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
      } else {
        hash.update(rel).update('\0');
        hash.update(fs.readFileSync(path.join(dir, rel))).update('\0');
      }
    }
  };
  walk('');
  return hash.digest('hex');
};

const setPlist = (file: string, values: Record<string, string>) => {
  for (const [key, value] of Object.entries(values)) {
    execFileSync('plutil', ['-replace', key, '-string', value, file]);
  }
};

/**
 * Makes `<outDir>/learnX.app` from `electronApp` unless the one there was
 * made from the same Electron version and icon, and returns its executable.
 */
export const macDevApp = ({
  electronApp,
  electronVersion,
  iconSource,
  outDir,
}: {
  electronApp: string;
  electronVersion: string;
  iconSource: string;
  outDir: string;
}): string => {
  const app = path.join(outDir, `${APP_NAME}.app`);
  const stampFile = path.join(outDir, `${APP_NAME}.app.json`);
  const stamp = JSON.stringify({
    recipe: RECIPE,
    electron: electronVersion,
    icon: hashFolder(iconSource),
  });
  const executable = path.join(app, 'Contents', 'MacOS', APP_NAME);
  if (
    fs.existsSync(executable) &&
    fs.existsSync(stampFile) &&
    fs.readFileSync(stampFile, 'utf8') === stamp
  ) {
    return executable;
  }

  console.log(`Making ${path.relative(process.cwd(), app)}…`);
  fs.rmSync(stampFile, { force: true });
  fs.rmSync(app, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  // ditto keeps the frameworks' symlinks.
  execFileSync('ditto', [electronApp, app]);

  const contents = path.join(app, 'Contents');
  const plan = renames();
  fs.renameSync(
    path.join(contents, plan.executable.from),
    path.join(contents, plan.executable.to),
  );
  setPlist(path.join(contents, 'Info.plist'), plan.plist);
  for (const helper of plan.helpers) {
    const helperApp = path.join(contents, helper.to);
    fs.renameSync(path.join(contents, helper.from), helperApp);
    fs.renameSync(
      path.join(helperApp, 'Contents', 'MacOS', helper.executable.from),
      path.join(helperApp, 'Contents', 'MacOS', helper.executable.to),
    );
    setPlist(path.join(helperApp, 'Contents', 'Info.plist'), helper.plist);
  }

  // The Mac icon as Xcode makes it for the Mac Catalyst app: AppIcon.icns
  // and the asset catalog (Assets.car) that macOS 26 draws it from.
  const resources = path.join(contents, 'Resources');
  fs.rmSync(path.join(resources, 'electron.icns'));
  execFileSync(
    'xcrun',
    [
      'actool',
      iconSource,
      '--compile',
      resources,
      '--platform',
      'macosx',
      '--minimum-deployment-target',
      '13.0',
      '--app-icon',
      'AppIcon',
      '--output-partial-info-plist',
      path.join(outDir, 'AppIcon.plist'),
    ],
    { stdio: 'ignore' },
  );
  fs.rmSync(path.join(outDir, 'AppIcon.plist'));

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], {
    stdio: 'ignore',
  });
  fs.writeFileSync(stampFile, stamp);
  return executable;
};
