/**
 * The app's spacing scale, in points, for the space between and around
 * things: lay a group out with `gap` from here instead of giving each child
 * its own margin, so neighbors never add their margins up.
 */
const Spacing = {
  /** Between lines of one thing, such as a label and its caption. */
  xs: 4,
  /** Between related controls in a row. */
  s: 8,
  /** Between items of a stack, and a screen's side margin. */
  m: 16,
  /** Between groups. */
  l: 24,
  /** Around a screen's main block. */
  xl: 32,
} as const;

export default Spacing;
