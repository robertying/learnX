import type { StyleProp, ViewStyle } from 'react-native';

export interface ContainedButtonProps {
  label: string;
  disabled?: boolean;
  /**
   * Shows a small spinner before the label, in the platform's own way, while
   * the action runs. The button can't be pressed meanwhile; pass a label
   * that says what is happening (正在登录…).
   */
  loading?: boolean;
  /**
   * `large` is the tall button at the bottom of a welcome or set-up page on
   * iOS and Mac; Android's filled button has one size.
   */
  size?: 'regular' | 'large';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
