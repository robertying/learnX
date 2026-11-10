import type { StyleProp, ViewStyle } from 'react-native';

export interface SpinnerProps {
  /** Between 0 and 1. Shown as a percentage under the spinner when set. */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}
