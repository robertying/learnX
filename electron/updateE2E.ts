#!/usr/bin/env node
// A real update of the packaged app, end to end, as scripts/e2e/e2e-updater.sh
// does for the Android APKs: on Windows the NSIS installer, on Linux the
// AppImage (a .deb's update only downloads and opens in the system's
// installer, which updates.e2e.ts covers).
//
//   pnpm e2e:electron:update [--skip-export] [-- <Playwright options>]
//
// 1. Makes a throwaway Ed25519 update key. Its private half stays in this
//    process; only the public half is written, for the builds to carry.
// 2. Packages 99.0.0 and 99.0.1 for this computer's CPU (package.ts), both
//    trusting that key and looking for updates on a local server.
// 3. Signs 99.0.1's update file with the key and serves its folder as the
//    mirror serves a release (updateServer.ts).
// 4. Installs 99.0.0: the installer, silently, as the current user, or the
//    AppImage copied under a name without a version, as a user keeps it.
// 5. Runs e2e/installUpdate.e2e.ts on the installed app, which updates it
//    from Settings and checks that it comes back as 99.0.1.
// 6. Uninstalls it on Windows, and deletes the key.
//
// Everything goes in build/electron/update-e2e, and the AppImage's data in
// a folder there too. The Windows installer can only install for the
// current user, where a real learnX would be, so this refuses to run where
// learnX is installed or has left its data. Needs the mock login in .env (as
// the other E2E tests do) for the web build, which --skip-export reuses from
// build/electron/web.
import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createUpdateServer } from './updateServer.ts';
import { SIGNATURE_SUFFIX, signUpdateFile } from './updateSignature.ts';
import electronPackage from './package.json' with { type: 'json' };

const electronDir = import.meta.dirname;
const root = path.join(electronDir, '..');
const work = path.join(root, 'build', 'electron', 'update-e2e');
const FROM = '99.0.0';
const TO = '99.0.1';

const { values, positionals } = parseArgs({
  options: { 'skip-export': { type: 'boolean', default: false } },
  allowPositionals: true,
});

if (process.platform !== 'win32' && process.platform !== 'linux') {
  console.error('Windows or Linux only: the Mac has the Mac Catalyst app.');
  process.exit(1);
}
const windows = process.platform === 'win32';
const localAppData = process.env.LOCALAPPDATA ?? '';
/** Where the installer installs for the current user (packageConfig.ts). */
const installDir = path.join(localAppData, 'Programs', 'learnX');
if (windows) {
  for (const dir of [installDir, path.join(localAppData, 'learnX')]) {
    if (fs.existsSync(dir)) {
      console.error(
        `${dir} exists: this would replace the learnX installed for you, and uninstalling removes its data. Run it where learnX isn't installed (CI).`,
      );
      process.exit(1);
    }
  }
}

/**
 * Runs a Node script of the checkout; its exit status. Asynchronously, so the
 * update server in this process answers meanwhile.
 */
const run = (args: string[], env: NodeJS.ProcessEnv = process.env) =>
  new Promise<number>(resolve => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: 'inherit',
      env,
    });
    child.on('error', error => {
      console.error(error);
      resolve(1);
    });
    child.on('exit', code => resolve(code ?? 1));
  });

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

// The server's port goes into the builds, so it's taken first.
const releaseDir = path.join(work, TO);
const serverLog: string[] = [];
const server = createUpdateServer(releaseDir, line => serverLog.push(line));
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const updateUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

const key = generateKeyPairSync('ed25519');
const publicKey = key.publicKey.export({ type: 'spki', format: 'pem' });
const publicKeyFile = path.join(work, 'update-key.pem');
fs.writeFileSync(publicKeyFile, publicKey);

let status = 0;
let installed = '';
try {
  for (const [index, version] of [FROM, TO].entries()) {
    status = await run([
      path.join(electronDir, 'package.ts'),
      windows ? '--win' : '--linux',
      '--arch',
      process.arch,
      '--version',
      version,
      '--update-url',
      updateUrl,
      '--update-public-key',
      publicKeyFile,
      '--output',
      path.join(work, version),
      ...(values['skip-export'] || index > 0 ? ['--skip-export'] : []),
    ]);
    if (status !== 0) {
      throw new Error(`Packaging ${version} failed`);
    }
  }
  // As scripts/release/sign-electron-update.mjs signs a release's.
  const privateKey = key.privateKey.export({ type: 'pkcs8', format: 'pem' });
  for (const name of fs.readdirSync(releaseDir)) {
    if (/^latest(-[\w-]+)?\.yml$/.test(name)) {
      const file = path.join(releaseDir, name);
      fs.writeFileSync(
        file + SIGNATURE_SUFFIX,
        signUpdateFile(fs.readFileSync(file), privateKey),
      );
    }
  }

  const arch = process.arch === 'x64' ? 'x86_64' : process.arch;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LEARNX_UPDATE_E2E_FROM: FROM,
    LEARNX_UPDATE_E2E_TO: TO,
  };
  if (windows) {
    const setup = spawnSync(
      path.join(work, FROM, `learnX-windows-v${FROM}.exe`),
      ['/S'],
      { stdio: 'inherit' },
    );
    installed = path.join(installDir, 'learnX.exe');
    if (setup.status !== 0 || !fs.existsSync(installed)) {
      throw new Error(`Not installed: ${installed}`);
    }
  } else {
    // Without a version in its name, the update replaces it in place
    // (electron-updater's AppImageUpdater), as for a user who renamed it.
    installed = path.join(work, 'app', 'learnX.AppImage');
    fs.mkdirSync(path.dirname(installed));
    fs.copyFileSync(
      path.join(work, FROM, `learnX-linux-${arch}-v${FROM}.AppImage`),
      installed,
    );
    fs.chmodSync(installed, 0o755);
    // Its data and electron-updater's downloads, which the app opened again
    // by the update keeps too.
    env.XDG_CONFIG_HOME = path.join(work, 'config');
    env.XDG_CACHE_HOME = path.join(work, 'cache');
  }
  console.log(
    `Installed ${FROM} at ${installed}; serving ${TO} at ${updateUrl}`,
  );

  const require = createRequire(path.join(electronDir, 'package.json'));
  status = await run(
    [
      require.resolve('@playwright/test/cli'),
      'test',
      '-c',
      path.join(electronDir, 'playwright.config.ts'),
      'installUpdate.e2e.ts',
      ...positionals,
    ],
    // LEARNX_E2E_APP: no dev run, so Electron isn't downloaded (e2e/setup.ts).
    { ...env, LEARNX_UPDATE_E2E_APP: installed, LEARNX_E2E_APP: installed },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  status = 1;
} finally {
  server.close();
  fs.rmSync(publicKeyFile, { force: true });
  // package.ts's copy of it.
  fs.rmSync(path.join(root, 'build', 'electron', 'test-update-key'), {
    recursive: true,
    force: true,
  });
  console.log(`Update server's requests:\n  ${serverLog.join('\n  ')}`);
  if (windows && installed && fs.existsSync(installed)) {
    // The uninstaller copies itself to the temp folder and returns at once.
    spawnSync(path.join(installDir, 'Uninstall learnX.exe'), ['/S'], {
      stdio: 'inherit',
    });
    for (let i = 0; i < 60 && fs.existsSync(installed); i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // electron-updater's downloads, named after the package as
    // electron-builder names them (and installer.nsh removes them).
    fs.rmSync(path.join(localAppData, `${electronPackage.name}-updater`), {
      recursive: true,
      force: true,
    });
  }
}
process.exit(status);
