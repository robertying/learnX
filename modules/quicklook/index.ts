import { Platform } from 'react-native';
import type { ViewProps } from 'react-native';
import { requireNativeView, requireOptionalNativeModule } from 'expo';

export interface QuickLookViewProps extends ViewProps {
  /** The downloaded file, as a `file:` URI. */
  uri: string;
  /** It has no preview to show: no window to put it in. */
  onUnavailable?: () => void;
}

/**
 * Whether the Mac's Quick Look preview loaded (the app's MacPreview plugin).
 * False off the Mac.
 */
const QuickLookModule = requireOptionalNativeModule<{
  isAvailable: boolean;
  showQuickLookPanel: (uri: string) => Promise<void>;
}>('LearnXQuickLook');

export const isQuickLookAvailable: boolean =
  QuickLookModule?.isAvailable ?? false;

/**
 * Opens Quick Look's floating panel on a downloaded file (a `file:` URI), or
 * closes it if it shows that file, as Space does in Finder. Mac only, where
 * `isQuickLookAvailable`.
 */
export const showQuickLookPanel = (uri: string) =>
  QuickLookModule?.showQuickLookPanel(uri) ?? Promise.resolve();

/**
 * AppKit's Quick Look preview of a downloaded file, which File detail shows on
 * the Mac for the Office and iWork documents the Mac's web view doesn't
 * convert.
 */
export const QuickLookView: React.ComponentType<QuickLookViewProps> =
  Platform.OS === 'ios'
    ? requireNativeView('LearnXQuickLook', 'QuickLookView')
    : () => null;
