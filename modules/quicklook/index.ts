import { Platform } from 'react-native';
import type { ViewProps } from 'react-native';
import { requireNativeView } from 'expo';

export interface QuickLookViewProps extends ViewProps {
  /** The downloaded file, as a `file:` URI. */
  uri: string;
}

/** Quick Look's preview of a downloaded file. iOS and Mac only. */
export const QuickLookView: React.ComponentType<QuickLookViewProps> =
  Platform.OS === 'ios'
    ? requireNativeView('LearnXQuickLook', 'QuickLookView')
    : () => null;
