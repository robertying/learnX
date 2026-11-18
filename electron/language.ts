// The app's own language setting, for Windows and Linux, which have no
// per-app language as macOS, iOS and Android do: the system's, Simplified
// Chinese or English, kept in the app's data folder (`language.json`). It
// takes effect at launch, through Chromium's `--lang`, so the page
// (navigator.languages, which helpers/i18n reads), its dates and mock data,
// and the tray and dialogs, which follow the page, all switch with it.
import fs from 'node:fs';

/** As the page's bridge names them (src/web/bridgeTypes.ts, `AppLanguage`). */
export const APP_LANGUAGES = ['system', 'zh-CN', 'en-US'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  APP_LANGUAGES.includes(value as AppLanguage);

/**
 * Whether the app offers its own language setting: on Windows and Linux, and
 * in a Mac dev run that asks for it (`LEARNX_LANGUAGE_SETTING=1`), for the
 * E2E tests and captures.
 */
export const languageSupported = (
  platform: string,
  allowOnMac = false,
): boolean =>
  platform === 'win32' ||
  platform === 'linux' ||
  (platform === 'darwin' && allowOnMac);

/** The language saved, or the system's when there's none or it's unreadable. */
export const readLanguage = (file: string): AppLanguage => {
  try {
    const saved: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))?.language;
    return isAppLanguage(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
};

/** Saves the language for the next launch; false if it couldn't be. */
export const saveLanguage = (file: string, language: unknown): boolean => {
  if (!isAppLanguage(language)) {
    return false;
  }
  try {
    fs.writeFileSync(file, JSON.stringify({ language }));
    return true;
  } catch {
    return false;
  }
};

/**
 * Sets Chromium's language for this launch to the one saved, before the app
 * is ready; the system's needs nothing. It takes the place of a `--lang`
 * given on the command line.
 */
export const applyLanguage = (
  commandLine: Pick<Electron.CommandLine, 'appendSwitch'>,
  language: AppLanguage,
): void => {
  if (language !== 'system') {
    commandLine.appendSwitch('lang', language);
  }
};
