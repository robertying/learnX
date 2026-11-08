import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { useTheme } from 'theme';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Height in points; a badge without children is a dot of this size. */
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** A small count or dot, in the error color unless the style sets one. */
const Badge: React.FC<BadgeProps> = ({ children, size = 20, style }) => {
  const theme = useTheme();

  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.error,
          color: theme.colors.onError,
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
