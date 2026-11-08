import type { StyleProp, ViewStyle } from 'react-native';

/**
 * The icons an IconButton can show. Each platform maps a name to its own
 * symbol: an SF Symbol on iOS and Mac, a Material Symbol on Android.
 */
export type IconButtonIcon =
  | 'archive'
  | 'back'
  | 'checkAll'
  | 'close'
  | 'download'
  | 'exitFullscreen'
  | 'filter'
  | 'forward'
  | 'fullscreen'
  | 'info'
  | 'openInNew'
  | 'preview'
  | 'refresh'
  | 'reorder'
  | 'restore'
  | 'search'
  | 'select'
  | 'settings'
  | 'share'
  | 'upload';

export interface IconButtonProps {
  icon: IconButtonIcon;
  /** The icon's size in points. */
  size?: number;
  /** `contained` puts the icon on a filled circle, to show a mode is on. */
  mode?: 'contained';
  /** Shows a dot on the icon, for something new behind the button. */
  badge?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** The space around the icon, inside the button. */
export const PADDING = 8;
