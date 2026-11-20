import type { StyleProp, ViewStyle } from 'react-native';

export interface ProgressBarProps {
  /** Between 0 and 1. */
  progress: number;
  /** What the bar measures, such as an upload, for screen readers. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}
