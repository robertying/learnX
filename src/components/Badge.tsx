import {
  PlatformColor,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
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

export interface BadgeProps {
  children?: React.ReactNode;
  /** Height in points; a badge without children is a dot of this size. */
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** A small count or dot, in the badge color unless the style sets one. */
const Badge: React.FC<BadgeProps> = ({ children, size = 20, style }) => {
  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[
        styles.badge,
        {
          backgroundColor: BADGE_COLOR,
          color: 'white',
          fontSize: size * 0.5,
          lineHeight: size,
          height: size,
          minWidth: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-end',
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    paddingHorizontal: 3,
  },
});

export default Badge;
