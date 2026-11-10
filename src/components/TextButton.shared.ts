import {
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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

type Margin = DimensionValue | undefined;

const points = (...values: Margin[]) => {
  const value = values.find(margin => margin !== undefined);
  return typeof value === 'number' ? value : 0;
};

/**
 * Pulls a button's touch padding into the gutter, overlapping its neighbors
 * like an inline link, so the label lines up with the text around it and the
 * row keeps its height. The offsets add to the caller's margins rather than
 * being replaced by them.
 */
export const withGutter = (
  style: StyleProp<ViewStyle>,
  gutter: { vertical: number; start?: number },
): [StyleProp<ViewStyle>, ViewStyle] => {
  const {
    margin,
    marginVertical,
    marginHorizontal,
    marginTop,
    marginBottom,
    marginStart,
    marginLeft,
  } = StyleSheet.flatten(style) ?? {};
  return [
    style,
    {
      marginTop: points(marginTop, marginVertical, margin) - gutter.vertical,
      marginBottom:
        points(marginBottom, marginVertical, margin) - gutter.vertical,
      ...(gutter.start
        ? {
            marginStart:
              points(marginStart, marginLeft, marginHorizontal, margin) -
              gutter.start,
          }
        : null),
    },
  ];
};
