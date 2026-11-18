import type { AppLanguage } from 'web/bridgeTypes';

/** The app's own language setting, and a way to change it. */
export interface AppLanguageSetting {
  /** What's chosen: the system's, or a language for the next launch on. */
  language: AppLanguage;
  /** Saves a choice for the next launch; resolves to whether it was saved. */
  set: (language: AppLanguage) => Promise<boolean>;
  /** Quits and starts learnX again, in the language chosen. */
  relaunch: () => void;
}

/**
 * The app's own language, which only the Electron app offers, on Windows and
 * Linux (useAppLanguage.web.ts): the phones and the Mac use the system's
 * per-app language.
 */
const useAppLanguage = (): AppLanguageSetting | null => null;

export default useAppLanguage;
