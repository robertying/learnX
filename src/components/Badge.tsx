import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'theme';
import type { BadgeProps } from './Badge.shared';

export type { BadgeProps } from './Badge.shared';

const SIZE = 20;
const DOT_SIZE = 8;

/**
 * A small count or dot. SwiftUI has no badge view (its `badge` modifier only
 * shows in list rows and tab items), so iOS and Mac draw a pill like the
 * system's own counts; Android uses the Material 3 badge.
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  backgroundColor,
  color,
  style,
}) => {
  const theme = useTheme();
  const hasContent = children !== undefined && children !== '';

  return (
    <View
      style={[
        hasContent ? styles.pill : styles.dot,
        { backgroundColor: backgroundColor ?? theme.colors.error },
        style,
      ]}
    >
      {hasContent ? (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[styles.text, { color: color ?? theme.colors.onError }]}
        >
          {children}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-end',
    height: SIZE,
    minWidth: SIZE,
    borderRadius: SIZE / 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    alignSelf: 'flex-end',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  text: {
    fontSize: SIZE * 0.5,
    textAlign: 'center',
  },
});

export default Badge;
