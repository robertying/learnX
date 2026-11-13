import type { StyleProp, ViewStyle } from 'react-native';

export interface ContainedButtonProps {
  label: string;
  disabled?: boolean;
  /**
   * `large` is the tall button at the bottom of a welcome or set-up page on
   * iOS and Mac; Android's filled button has one size.
   */
  size?: 'regular' | 'large';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
