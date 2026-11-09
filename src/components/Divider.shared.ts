import type { StyleProp, ViewStyle } from 'react-native';

export interface DividerProps {
  /** A vertical line that fills the height of its row, instead of a horizontal one. */
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}
