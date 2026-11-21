// Updates (updater.ts) against updateServer.ts, the local stand-in for the
// TUNA mirror's LatestRelease/ folder: a dev run with LEARNX_UPDATE_URL
// checks a second after launch, downloads the installer named in
// latest*.yml and checks its SHA-512; Settings then offers it, and Restart
// quits into the installer (recorded instead, mainProcess.ts). The installer
// here is made-up bytes: what's tested is learnX's side, not the installer.
// The update file is signed with a throwaway key whose public half the run
// trusts (LEARNX_UPDATE_PUBLIC_KEY), as a release's are with the update key
// (updateSignature.ts); without a valid signature nothing is downloaded.
// A downloaded update is also said in a notification (a dev run records
// it, system.ts), held back until someone has logged in. A .deb
// (LEARNX_UPDATE_MODE=notify) downloads and is checked the same way, and
// opens in the system's installer from Settings instead of restarting.
import { type ChildProcess, spawn } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { SIGNATURE_SUFFIX, signUpdateFile } from '../updateSignature.ts';
import { expect, packagedApp, test } from './fixtures.ts';
import { exact, text } from './maestroEnv.ts';
import { byId, openSettings, openTab, shown } from './steps.ts';

const VERSION = '99.0.0';

/**
 * The update file and installer this platform's electron-updater reads, or
 * on Linux with `deb`, a .deb's.
 */
const release = ({ deb = false } = {}) => {
  if (deb) {
    return {
      yml: release().yml,
      installer: `learnX-linux-${process.arch === 'x64' ? 'amd64' : process.arch}-v${VERSION}.deb`,
    };
  }
  switch (process.platform) {
    case 'win32':
      return { yml: 'latest.yml', installer: `learnX-windows-v${VERSION}.exe` };
    case 'linux':
      return {
        yml:
          process.arch === 'arm64'
            ? 'latest-linux-arm64.yml'
            : 'latest-linux.yml',
        installer: `learnX-linux-${process.arch === 'x64' ? 'x86_64' : process.arch}-v${VERSION}.AppImage`,
      };
    default:
      return { yml: 'latest-mac.yml', installer: `learnX-${VERSION}.zip` };
  }
};

const keyPair = () => generateKeyPairSync('ed25519');
/** The key the runs trust, and another. */
const trustedKey = keyPair();
const otherKey = keyPair();

type Signature = 'good' | 'missing' | 'bad' | 'wrong key';

/**
 * A release folder as the mirror has it, with `sha512` for the installer and
 * the update file's signature.
 */
const writeRelease = (
  dir: string,
  {
    badChecksum = false,
    signature = 'good',
    deb = false,
  }: { badChecksum?: boolean; signature?: Signature; deb?: boolean } = {},
) => {
  fs.mkdirSync(dir, { recursive: true });
  const { yml, installer } = release({ deb });
  const bytes = randomBytes(64 * 1024);
  fs.writeFileSync(path.join(dir, installer), bytes);
  const sha512 = createHash('sha512')
    .update(badChecksum ? Buffer.from('something else') : bytes)
    .digest('base64');
  fs.writeFileSync(
    path.join(dir, yml),
    [
      `version: ${VERSION}`,
      'files:',
      `  - url: ${installer}`,
      `    sha512: ${sha512}`,
      `    size: ${bytes.length}`,
      `path: ${installer}`,
      `sha512: ${sha512}`,
      "releaseDate: '2026-11-16T00:00:00.000Z'",
      '',
    ].join('\n'),
  );
  if (signature !== 'missing') {
    const data = fs.readFileSync(path.join(dir, yml));
    fs.writeFileSync(
      path.join(dir, yml + SIGNATURE_SUFFIX),
      signUpdateFile(
        signature === 'bad' ? Buffer.from('something else') : data,
        (signature === 'wrong key' ? otherKey : trustedKey).privateKey.export({
          type: 'pkcs8',
          format: 'pem',
        }),
      ),
    );
  }
  return installer;
};

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

/** Serves `dir` with updateServer.ts; its request log lines go to `log`. */
const serve = async (dir: string, log: string[]) => {
  const port = await freePort();
  const server = spawn(
    process.execPath,
    [
      path.join(import.meta.dirname, '..', 'updateServer.ts'),
      dir,
      '--port',
      String(port),
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  await new Promise<void>((resolve, reject) => {
    server.once('exit', code =>
      reject(new Error(`updateServer.ts exited with ${code}`)),
    );
    server.stdout!.setEncoding('utf8');
    server.stdout!.on('data', (chunk: string) => {
      for (const line of chunk.split('\n').filter(Boolean)) {
        if (line.startsWith('Serving ')) {
          resolve();
        } else {
          log.push(line);
        }
      }
    });
  });
  return { server, url: `http://127.0.0.1:${port}/` };
};

/**
 * The update's environment: the server, and on Linux the AppImage being
 * updated (AppImageUpdater reads it to download, and would replace it).
 */
const updateEnv = (url: string, dataDir: string): Record<string, string> => {
  const publicKey = path.join(dataDir, 'update-key.pem');
  fs.writeFileSync(
    publicKey,
    trustedKey.publicKey.export({ type: 'spki', format: 'pem' }),
  );
  const env = {
    LEARNX_UPDATE_URL: url,
    LEARNX_UPDATE_PUBLIC_KEY: publicKey,
  };
  if (process.platform !== 'linux') {
    return env;
  }
  const appImage = path.join(dataDir, 'learnX.AppImage');
  fs.writeFileSync(appImage, randomBytes(1024));
  return { ...env, APPIMAGE: appImage };
};

let server: ChildProcess | undefined;
test.afterEach(() => {
  server?.kill();
  server = undefined;
});

test.skip(!!packagedApp, 'a packaged app reads where to update from its build');

test('downloads an update and restarts into it', async ({
  login,
  relaunch,
  dataDir,
}) => {
  const log: string[] = [];
  const installer = writeRelease(path.join(dataDir, 'release'));
  const served = await serve(path.join(dataDir, 'release'), log);
  server = served.server;
  await login();
  const { window, main } = await relaunch({
    env: updateEnv(served.url, dataDir),
  });
  await main.stubInstall();
  await openSettings(window);

  // The first check comes a second after launch.
  const row = byId(window, 'settings-update');
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText(text('T_foundNewVersion'));
  await expect(row).toContainText(VERSION);
  expect(log.some(line => line.startsWith(`GET /${release().yml}`))).toBe(true);
  expect(log.some(line => line.startsWith(`GET /${installer}`))).toBe(true);

  await row.click();
  const dialog = window.getByRole('dialog');
  await expect(dialog).toContainText(VERSION);
  await dialog.getByRole('button', { name: exact('T_restart') }).click();
  await expect.poll(async () => (await main.record()).installs).toBe(1);
});

/** The notifications that say an update is out. */
const updateNotifications = async (main: {
  shownNotifications: () => Promise<{ title?: string; body?: string }[]>;
}) =>
  (await main.shownNotifications()).filter(({ title }) =>
    exact('T_notifyNewVersion').test(title ?? ''),
  );

test('says a downloaded update in a notification that opens Settings', async ({
  login,
  relaunch,
  dataDir,
}) => {
  writeRelease(path.join(dataDir, 'release'));
  const served = await serve(path.join(dataDir, 'release'), []);
  server = served.server;
  await login();
  const { window, main } = await relaunch({
    env: updateEnv(served.url, dataDir),
  });
  await openTab(window, 'notices');

  await expect
    .poll(async () => (await updateNotifications(main)).length, {
      timeout: 60_000,
    })
    .toBe(1);
  const [notification] = await updateNotifications(main);
  expect(notification.body).toContain(`v${VERSION}`);
  expect(notification.body).toMatch(text('T_updateNotificationReadyBody'));

  await main.clickNotification();
  await expect(byId(window, 'settings-update')).toBeVisible();
});

test('holds the notification until someone logs in', async ({
  login,
  relaunch,
  dataDir,
}) => {
  writeRelease(path.join(dataDir, 'release'));
  const served = await serve(path.join(dataDir, 'release'), []);
  server = served.server;
  // A new install, on the welcome page.
  const { window, main } = await relaunch({
    env: updateEnv(served.url, dataDir),
  });
  await expect
    .poll(async () => (await main.updaterLog()).join('\n'), {
      timeout: 60_000,
    })
    .toContain(`downloaded ${VERSION}`);
  expect(await updateNotifications(main)).toEqual([]);

  await login(window);
  await expect
    .poll(async () => (await updateNotifications(main)).length)
    .toBe(1);
});

test('opens a .deb’s verified download in the system’s installer', async ({
  login,
  relaunch,
  dataDir,
}) => {
  test.skip(process.platform !== 'linux', 'a .deb is for Linux');
  const log: string[] = [];
  const releaseDir = path.join(dataDir, 'release');
  const installer = writeRelease(releaseDir, { deb: true });
  const served = await serve(releaseDir, log);
  server = served.server;
  await login();
  const { window, main } = await relaunch({
    env: { ...updateEnv(served.url, dataDir), LEARNX_UPDATE_MODE: 'notify' },
  });
  await main.stubInstall();
  await openSettings(window);

  const row = byId(window, 'settings-update');
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row).toContainText(VERSION);
  // Checked against its signature, and downloaded.
  expect(log.some(line => line.startsWith(`GET /${release().yml}.sig`))).toBe(
    true,
  );
  expect(log.some(line => line.startsWith(`GET /${installer}`))).toBe(true);

  await row.click();
  const dialog = window.getByRole('dialog');
  await expect(dialog).toContainText(text('T_updateDebMessage'));
  await expect(
    dialog.getByRole('button', { name: exact('T_restart') }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: exact('T_open') }).click();
  await expect
    .poll(async () => (await main.record()).openedPaths)
    .toHaveLength(1);
  const [opened] = (await main.record()).openedPaths;
  expect(path.basename(opened)).toBe(installer);
  expect(fs.readFileSync(opened)).toEqual(
    fs.readFileSync(path.join(releaseDir, installer)),
  );
  expect((await main.record()).installs).toBe(0);
});

for (const deb of [false, true]) {
  test(`offers no ${deb ? '.deb' : 'update'} that doesn’t match its checksum`, async ({
    login,
    relaunch,
    dataDir,
  }) => {
    test.skip(deb && process.platform !== 'linux', 'a .deb is for Linux');
    const log: string[] = [];
    const installer = writeRelease(path.join(dataDir, 'release'), {
      badChecksum: true,
      deb,
    });
    const served = await serve(path.join(dataDir, 'release'), log);
    server = served.server;
    await login();
    const { window, main } = await relaunch({
      env: {
        ...updateEnv(served.url, dataDir),
        ...(deb ? { LEARNX_UPDATE_MODE: 'notify' } : {}),
      },
    });
    await main.stubInstall();
    await openSettings(window);
    // The download went through, and was refused.
    await expect
      .poll(() => log.some(line => line.startsWith(`GET /${installer}`)), {
        timeout: 60_000,
      })
      .toBe(true);
    await expect(shown(window.getByTestId('settings-list'))).toBeVisible();
    await expect(window.getByTestId('settings-update')).toHaveCount(0);
  });
}

for (const signature of ['missing', 'bad', 'wrong key'] as const) {
  test(`downloads nothing when the update file’s signature is ${signature}`, async ({
    login,
    relaunch,
    dataDir,
  }) => {
    const log: string[] = [];
    const installer = writeRelease(path.join(dataDir, 'release'), {
      signature,
    });
    const served = await serve(path.join(dataDir, 'release'), log);
    server = served.server;
    await login();
    const { window, main } = await relaunch({
      env: updateEnv(served.url, dataDir),
    });
    await main.stubInstall();
    await openSettings(window);
    // The update file and its signature were read, and refused.
    await expect
      .poll(
        () => log.some(line => line.startsWith(`GET /${release().yml}.sig`)),
        { timeout: 60_000 },
      )
      .toBe(true);
    await expect
      .poll(async () => (await main.updaterLog()).join('\n'))
      .toContain(`${release().yml} refused`);
    expect(log.some(line => line.startsWith(`GET /${installer}`))).toBe(false);
    await expect(window.getByTestId('settings-update')).toHaveCount(0);
  });
}
