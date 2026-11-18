import { t } from 'helpers/i18n';
import { bridge } from 'web/bridge';

/** Whether this run has no sandbox: asked of the main process once. */
let unsandboxed: boolean | undefined;

/**
 * A note for Settings when the Electron app runs without Chromium's sandbox
 * (an AppImage on Ubuntu 24.04 and later, electron/main.ts), suggesting
 * the .deb; null otherwise.
 */
const useSandboxNote = (): string | null => {
  unsandboxed ??= bridge().appInfo().unsandboxed === true;
  return unsandboxed ? t('unsandboxedNote') : null;
};

export default useSandboxNote;
