import type { StyleProp, ViewStyle } from 'react-native';

export interface TextButtonProps {
  /** The label. */
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * The text size, which follows the system text size setting (Dynamic Type,
   * Android font scale). `small` sits next to captions, `large` is the size of
   * a navigation bar button.
   * @default 'regular'
   */
  size?: 'small' | 'regular' | 'large';
  bold?: boolean;
  /** Crossed out and dimmed, for a file that is being replaced or removed. */
  struck?: boolean;
  /**
   * Takes the width its layout gives it and shortens a long label to one
   * line (in the middle on iOS, keeping a file's extension), for file names.
   * It stretches across a column; in a row, give it `flex: 1`. Without it the
   * button is as wide as its label.
   */
  fill?: boolean;
  /** Layout of the button (margins, flex); the look is the system's. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
