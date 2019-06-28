// Type definitions for react-native-snackbar 0.3.4
// Project: https://github.com/cooperka/react-native-snackbar
// Definitions by: Kyle Roach <https://github.com/iRoachie>
// TypeScript Version: 2.2.2

declare module "react-native-snackbar" {
  /**
   * An actionable button that can be shown on the Snackbar.
   */
  interface Action {
    /**
     * Text for the button.
     */
    readonly title: string;

    /**
     * Color of the text for the button.
     * Accepts various forms of colors such as hex, literals, rgba, etc.
     */
    readonly color?: string | number;

    /**
     * Function called when the user presses the button.
     */
    onPress?(): void;
  }

  /**
   * List of options to configure the Snackbar.
   */
  interface SnackBarOptions {
    /**
     * The text that appears on the Snackbar.
     */
    readonly title: string;

    /**
     * Color of the Snackbar title.
     * Accepts various forms of colors such as hex, literals, rgba, etc.
     */
    readonly color?: string | number;

    /**
     * Length of time the Snackbar stays on screen.
     * Must be one of Snackbar.LENGTH_SHORT, Snackbar.LENGTH_LONG, or Snackbar.LENGTH_INDEFINITE.
     */
    readonly duration?: number;

    /**
     * Background color of the snackbar
     * Accepts color strings such as hex, literals, rgba
     */
    readonly backgroundColor?: string;

    /**
     * Adds an actionable button to the snackbar on the right
     */
    readonly action?: Action;
  }

  /**
   * Snackbar duration of about a second.
   */
  export const LENGTH_SHORT: number;

  /**
   * Snackbar duration of about three seconds.
   */
  export const LENGTH_LONG: number;

  /**
   * Snackbar duration that lasts forever (until a new Snackbar is shown).
   */
  export const LENGTH_INDEFINITE: number;

  /**
   * Shows a native Snackbar component.
   *
   * @param {SnackBarOptions} options
   */
  export function show(options: SnackBarOptions): void;

  /**
   * Dismisses any and all active Snackbars.
   */
  export function dismiss(): void;
}
