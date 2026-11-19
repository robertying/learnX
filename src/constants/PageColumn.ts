import { isApple } from 'helpers/platform';
import Spacing from 'constants/Spacing';

/**
 * The column the first-run pages (welcome, log in, set-up, What's New) lay
 * their content in, so each page's title, fields and buttons start at the
 * same place as the next page's.
 */
const PageColumn = {
  /** Widest the column gets, on a tablet, an unfolded phone or a desktop. */
  maxWidth: 520,
  /** Side margin of the buttons at the bottom, and of everything on Android
   * and in the Electron app. */
  margin: Spacing.l,
  /** Side margin of the text on Apple platforms, which Apple's welcome
   * sheets inset further than their buttons. */
  textMargin: isApple() ? 40 : Spacing.l,
} as const;

export default PageColumn;
