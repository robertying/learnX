import type { StyleProp, ViewStyle } from 'react-native';

export interface ProgressBarProps {
  /** Between 0 and 1. */
  progress: number;
  style?: StyleProp<ViewStyle>;
}
