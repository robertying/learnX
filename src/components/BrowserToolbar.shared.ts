export interface BrowserToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  /** While a page loads, reload and open-in-browser are disabled. */
  loading: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onOpenInBrowser: () => void;
  /**
   * The space the toolbar covers at the bottom of the screen, so the page can
   * scroll clear of a toolbar that floats over it.
   */
  onOverlapChange?: (overlap: number) => void;
}
