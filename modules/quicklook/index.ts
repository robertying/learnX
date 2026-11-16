import { Platform } from 'react-native';
import type { ViewProps } from 'react-native';
import { requireNativeView } from 'expo';

export interface QuickLookViewProps extends ViewProps {
  /** The downloaded file, as a `file:` URI. */
  uri: string;
}

/**
 * Quick Look's preview of a downloaded file. File detail uses it on Mac only,
 * for the Office and iWork documents the Mac's web view doesn't convert.
 */
export const QuickLookView: React.ComponentType<QuickLookViewProps> =
  Platform.OS === 'ios'
    ? requireNativeView('LearnXQuickLook', 'QuickLookView')
    : () => null;
