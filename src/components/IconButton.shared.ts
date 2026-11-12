import type { StyleProp, ViewStyle } from 'react-native';
import type { iconDrawables } from 'assets/icons';
import type { SystemIconName, systemIcons } from 'helpers/systemIcons';

/**
 * The icons a button can show: the `helpers/systemIcons` meanings whose
 * Material Symbol has a drawable for Compose (`assets/icons`). iOS and Mac
 * draw the meaning's SF Symbol.
 */
export type IconButtonIcon = {
  [
    K in SystemIconName
  ]: (typeof systemIcons)[K]['android'] extends keyof typeof iconDrawables
    ? K
    : never;
}[SystemIconName];

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
