import { AppState } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import Updater, { type UpdateErrorCode } from 'modules/updater';
import type { Release } from 'helpers/update';
import { downloadInto } from 'services/files/downloads';

/** Where the APK is downloaded to, under Caches; deleted once it's used. */
export const UPDATE_DIR = 'update';

/** How long after people come back from Android's confirmation it counts as dismissed. */
const DISMISS_MS = 3000;

const updateDirectory = () => new Directory(Paths.cache, UPDATE_DIR);

/** Deletes a downloaded update, which an install ended by the app closing leaves behind. */
export const clearDownloadedUpdate = () => {
  try {
    const dir = updateDirectory();
    if (dir.exists) {
      dir.delete();
    }
  } catch {}
};

/**
 * Whether the app installs `release` itself: only the APKs can (not the
 * Google Play build), and only an APK `latest.json` gives a SHA-256 for.
 * Otherwise the APK opens in the browser.
 */
export const installsUpdate = (release: Release) =>
  !!Updater?.isSupported && !!release.sha256;

/**
 * Whether learnX still has to be allowed to install apps, which Android asks
 * once (`installUpdate` opens the page).
 */
export const needsInstallPermission = () => !(Updater?.canInstall() ?? false);

/** Why an update failed, as `modules/updater` names it, or a failed download. */
export type UpdateFailure = UpdateErrorCode | 'ERR_UPDATE_DOWNLOAD';

export class UpdateError extends Error {
  constructor(readonly code: UpdateFailure) {
    super(code);
  }
}

const failureOf = (error: unknown): UpdateFailure => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.startsWith('ERR_UPDATE_')
    ? (code as UpdateFailure)
    : 'ERR_UPDATE_FAILED';
};

/**
 * Calls `back` when the app is in the foreground again after leaving it, e.g.
 * for a system page or dialog. Returns what stops listening.
 */
const onceBack = (back: () => void) => {
  let away = false;
  const subscription = AppState.addEventListener('change', state => {
    if (state !== 'active') {
      away = true;
    } else if (away) {
      subscription.remove();
      back();
    }
  });
  return () => subscription.remove();
};

/**
 * Resolves once the app is in the foreground: at once if it is, otherwise
 * when people come back to it. Android doesn't let an app in the background
 * open its install confirmation.
 */
const inForeground = () =>
  AppState.currentState === 'active'
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        const subscription = AppState.addEventListener('change', state => {
          if (state === 'active') {
            subscription.remove();
            resolve();
          }
        });
      });

export type UpdateStep = 'downloading' | 'installing';

export interface InstallUpdateOptions {
  onStep?: (step: UpdateStep) => void;
  /** The share downloaded so far, 0 to 1 in steps of 0.01. */
  onProgress?: (progress: number) => void;
}

/**
 * Updates the app to `release` (`installsUpdate` must be true): has people
 * allow learnX to install apps first if they haven't, downloads the APK and
 * hands it to `modules/updater`, which checks it and installs it. Updating
 * ends the app, so this only settles when it fails, with an `UpdateError`.
 * A download that finishes in the background installs once the app is back
 * in the foreground. Declining Android's confirmation, or leaving it without
 * an answer (which some Android versions never report), fails with
 * `ERR_UPDATE_CANCELLED`.
 */
export const installUpdate = async (
  release: Release,
  { onStep, onProgress }: InstallUpdateOptions = {},
) => {
  const updater = Updater;
  const sha256 = release.sha256;
  if (!updater?.isSupported || !sha256) {
    throw new UpdateError('ERR_UPDATE_FAILED');
  }
  if (!updater.canInstall()) {
    await new Promise<void>(resolve => {
      onceBack(resolve);
      updater.openInstallSettings();
    });
    if (!updater.canInstall()) {
      throw new UpdateError('ERR_UPDATE_NOT_ALLOWED');
    }
  }

  onStep?.('downloading');
  clearDownloadedUpdate();
  const file = new File(updateDirectory(), `learnX-v${release.version}.apk`);
  try {
    try {
      updateDirectory().create({ intermediates: true, idempotent: true });
      await downloadInto(release.url, file, { onProgress });
    } catch {
      throw new UpdateError('ERR_UPDATE_DOWNLOAD');
    }

    // A download that finished while people were in another app installs
    // when they come back.
    await inForeground();
    onStep?.('installing');
    // Android's confirmation takes people out of the app. Back in it with no
    // answer, they dismissed it: an update would have ended the app by then.
    let stop = () => {};
    const dismissed = new Promise<never>((_, reject) => {
      stop = onceBack(() => {
        const timer = setTimeout(
          () => reject(new UpdateError('ERR_UPDATE_CANCELLED')),
          DISMISS_MS,
        );
        stop = () => clearTimeout(timer);
      });
    });
    try {
      await Promise.race([
        updater.install(file.uri, sha256).catch((error: unknown) => {
          throw new UpdateError(failureOf(error));
        }),
        dismissed,
      ]);
    } finally {
      stop();
    }
  } finally {
    clearDownloadedUpdate();
  }
};
