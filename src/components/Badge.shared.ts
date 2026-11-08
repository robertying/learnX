import type { StyleProp, ViewStyle } from 'react-native';

export interface BadgeProps {
  /** A count; a badge without one is a dot. */
  children?: string | number;
  /** The fill; the error color by default. */
  backgroundColor?: string;
  /** The text color; the on-error color by default. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}
