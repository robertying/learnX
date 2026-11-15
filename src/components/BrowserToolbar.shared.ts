import { t } from 'helpers/i18n';

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

/** A toolbar button, the same on both platforms. */
export interface BrowserToolbarItem {
  icon: 'back' | 'forward' | 'refresh' | 'openInBrowser';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

/** The toolbar's buttons in order: back, forward, reload, open in browser. */
export const browserToolbarItems = ({
  canGoBack,
  canGoForward,
  loading,
  onBack,
  onForward,
  onReload,
  onOpenInBrowser,
}: BrowserToolbarProps): BrowserToolbarItem[] => [
  {
    icon: 'back',
    label: t('back'),
    disabled: !canGoBack,
    onPress: onBack,
    testID: 'courseXBack',
  },
  {
    icon: 'forward',
    label: t('forward'),
    disabled: !canGoForward,
    onPress: onForward,
    testID: 'courseXForward',
  },
  {
    icon: 'refresh',
    label: t('refresh'),
    disabled: loading,
    onPress: onReload,
    testID: 'courseXReload',
  },
  {
    icon: 'openInBrowser',
    label: t('openInBrowser'),
    disabled: loading,
    onPress: onOpenInBrowser,
    testID: 'courseXOpen',
  },
];
