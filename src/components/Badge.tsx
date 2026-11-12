import {
  PlatformColor,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

/**
 * The red of every badge on iOS, iPadOS and Mac: the system red, which the tab
 * bar, the Mac sidebar and header items draw theirs in, and which adapts to
 * dark mode and Increase Contrast. Android draws its badges with Compose and
 * Material Components, in Material's error role.
 */
export const BADGE_COLOR = PlatformColor('systemRed');

/**
 * A badge without a count is a dot this many points wide, as the system draws
 * one on the Mac sidebar and on iOS 26 header items.
 */
export const DOT_SIZE = 8;

/** A badge dot, for something new behind a button (iOS and Mac). */
const BadgeDot: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.dot, style]} />
);

const styles = StyleSheet.create({
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: BADGE_COLOR,
  },
});

export default BadgeDot;
