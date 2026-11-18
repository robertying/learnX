// English capitalization per platform. The English strings are written in
// Title Case for titles, rows, buttons and menu items, as Apple's (and
// GNOME's) guidelines have them. Material 3 and Microsoft's Fluent write the
// same text in sentence case ("Delete all downloads"), so on Android and in
// the Electron app `t()` turns a Title Case string into sentence case here,
// rather than keeping a second copy of every key.

/**
 * Names that keep their capitals in sentence case, as phrases first so a
 * longer name wins ("Web Learning" before "Web"). A word written with a capital
 * inside it (learnX, GitHub, AppImage) or in capitals only (OK, ID, TUNA) is
 * kept without being listed.
 */
const PROPER_NAMES = [
  'Electronic ID Service System of Tsinghua University',
  'System Settings',
  'Web Learning',
  'Quick Look',
  'Tsinghua',
  'Beijing',
  'Android',
  'Windows',
  'Linux',
  'Ubuntu',
  'Chromium',
  'Outlook',
  'Siri',
  'Spotlight',
  'Finder',
];

/** Short words Title Case leaves lowercase. */
const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

/** A word Title Case would capitalize: letters, maybe with an apostrophe. */
const WORD = /^[A-Za-z][A-Za-z’']*$/;

/** A word that keeps its capitals whatever the case: OK, ID, learnX, GitHub. */
const keepsCapitals = (word: string) =>
  /^[A-Z]{2,}$/.test(word) || /^[A-Za-z]+[A-Z]/.test(word);

/**
 * Whether `text` is written in Title Case: one line with no sentence in it
 * (it doesn't end with a period, nor hold one between sentences), and at
 * least two words, all capitalized but for the small ones. A message or caption in sentence case,
 * or a one-word label, is left alone.
 */
const isTitleCase = (text: string) => {
  if (text.includes('\n') || /[.!?]$|[.!?] /.test(text.trim())) {
    return false;
  }
  const words = text
    .split(/[\s/]+/)
    .map(word => word.replace(/^[(“"]+|[)”":,…?]+$/g, ''))
    .filter(word => WORD.test(word));
  const capitalized = words.filter(word => /^[A-Z]/.test(word));
  return (
    capitalized.length >= 2 &&
    words.every(word => /^[A-Z]/.test(word) || SMALL_WORDS.has(word))
  );
};

/**
 * `text` in sentence case when it is written in Title Case ("Delete All
 * Downloads" → "Delete all downloads", "{count} New Notices" → "{count} new
 * notices"): the first word, proper names and words that keep their capitals
 * stay as they are. Anything else comes back unchanged.
 */
export const toSentenceCase = (text: string) => {
  if (!isTitleCase(text)) {
    return text;
  }
  // Proper names are set aside as placeholders so the words in them stay.
  const kept: string[] = [];
  let masked = text;
  for (const name of PROPER_NAMES) {
    masked = masked.replace(new RegExp(`\\b${name}\\b`, 'g'), () => {
      kept.push(name);
      return `\uE000${kept.length - 1}\uE000`;
    });
  }
  let first = true;
  const lowered = masked.replace(
    /\uE000\d+\uE000|\{\w+\}|[A-Za-z][A-Za-z’']*/g,
    token => {
      if (token.startsWith('\uE000') || token.startsWith('{')) {
        first = false;
        return token;
      }
      if (first) {
        first = false;
        return token;
      }
      return keepsCapitals(token) ? token : token.toLowerCase();
    },
  );
  return lowered.replace(/\uE000(\d+)\uE000/g, (_, i: string) => kept[+i]);
};

/**
 * A dayjs format with its literal text (`[Late Deadline]`) in sentence case,
 * as `toSentenceCase` writes a string.
 */
export const formatToSentenceCase = (format: string) =>
  format.replace(
    /\[([^\]]+)\]/g,
    (_, literal: string) => `[${toSentenceCase(literal)}]`,
  );
