import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class UpdaterModule extends NativeModule {
  /**
   * Whether this build updates itself: true in the APKs (the github flavor),
   * false in the Google Play build, which Google Play updates.
   */
  readonly isSupported: boolean;
  /** Whether people allowed learnX to install apps ("Install unknown apps"). */
  canInstall(): boolean;
  /** Opens the system page where people allow learnX to install apps. */
  openInstallSettings(): void;
  /**
   * Installs the APK at `uri` (a file URL) as an update of learnX, once it
   * matches `sha256` (hex) and is learnX signed with the installed app's key.
   * Android asks to confirm, except on Android 12+ once learnX installed the
   * version it updates. Updating ends the app, so this only settles when the
   * install fails: it rejects with the error's `code`, one of
   * `UpdateErrorCode`.
   */
  install(uri: string, sha256: string): Promise<void>;
}

/** Why `install` failed. */
export type UpdateErrorCode =
  /** The download doesn't match the SHA-256 `latest.json` gives. */
  | 'ERR_UPDATE_CHECKSUM'
  /** The download isn't learnX signed with the installed app's key. */
  | 'ERR_UPDATE_SIGNATURE'
  /** learnX isn't allowed to install apps. */
  | 'ERR_UPDATE_NOT_ALLOWED'
  /** People declined Android's confirmation, or another install replaced it. */
  | 'ERR_UPDATE_CANCELLED'
  /** The installer failed. */
  | 'ERR_UPDATE_FAILED';

/**
 * Installs a downloaded update of the Android app (`services/update`). Null
 * on iOS and Mac, in Jest and in an app built before the module was added.
 */
export default requireOptionalNativeModule<UpdaterModule>('LearnXUpdater');
