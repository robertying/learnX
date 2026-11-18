import { addCjkGaps } from 'helpers/cjk';
import { bridge } from './bridge';

/**
 * Text the page hands the system to show outside it (the tray's menu, the
 * Jump List, dialogs, notifications), with the gap between Chinese and Latin
 * letters or digits typed in on Windows and Linux, which draw none, as on
 * Android (`spaceCjk` in helpers/i18n). Chromium draws it in the page itself
 * (`text-autospace`, index.web.js), and macOS in its own menus and dialogs.
 */
export const systemText = (text: string) =>
  bridge().platform === 'darwin' ? text : addCjkGaps(text);

/** Every string of `labels` as `systemText`. */
export const systemTexts = <T extends Record<string, string>>(labels: T): T =>
  Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [key, systemText(value)]),
  ) as T;
