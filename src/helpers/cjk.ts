// Spacing between Chinese and Latin letters or digits. iOS and macOS draw a
// narrow gap there themselves wherever they lay out text (the app,
// notifications, widgets); Android draws none. So Chinese strings never type
// a space there, and `spaceCjk` in helpers/i18n adds this gap on Android, as
// `web/systemText` does to what the Electron app has Windows and Linux show
// outside its page (Chromium draws it in the page).

/** About the gap iOS draws: a quarter em. */
export const CJK_GAP = ' ';

const HAN = /\p{Script=Han}/u;
const LATIN = /[A-Za-z0-9]/;

/** Each place in a text where Chinese meets a Latin letter or digit. */
const BOUNDARY =
  /(\p{Script=Han})(?=[A-Za-z0-9])|([A-Za-z0-9])(?=\p{Script=Han})/gu;

/**
 * A space typed between Chinese and a Latin letter, digit or `{placeholder}`,
 * which Chinese strings leave out.
 */
export const TYPED_CJK_SPACE =
  /\p{Script=Han} +[A-Za-z0-9{]|[A-Za-z0-9}] +\p{Script=Han}/u;

/** Whether a gap goes between the characters `before` and `after`. */
export const needsCjkGap = (before = '', after = '') =>
  (HAN.test(before) && LATIN.test(after)) ||
  (LATIN.test(before) && HAN.test(after));

/** `text` with `CJK_GAP` wherever Chinese meets a Latin letter or digit. */
export const addCjkGaps = (text: string) =>
  text.replace(BOUNDARY, `$1$2${CJK_GAP}`);

/** `pieces` joined, with `CJK_GAP` where one ends in Chinese and the next starts with a Latin letter or digit, or the other way round. */
export const joinWithCjkGaps = (pieces: string[]) =>
  pieces.reduce(
    (joined, piece) =>
      needsCjkGap(joined.at(-1), piece[0])
        ? joined + CJK_GAP + piece
        : joined + piece,
    '',
  );
