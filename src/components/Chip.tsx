import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'theme';
import type { ChipProps } from './Chip.shared';

export type { ChipProps } from './Chip.shared';

/**
 * A small outlined label. Display only.
 *
 * Android draws a Material 3 chip (`Chip.android.tsx`). iOS, iPadOS and Mac
 * have no chip control in UIKit or SwiftUI, so this stays a React Native
 * view: a SwiftUI version would be the same text and border inside a `Host`,
 * with no system behavior gained.
 */
const Chip: React.FC<ChipProps> = ({ children, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <Text
        selectable={false}
        numberOfLines={1}
        style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500',
    marginVertical: 6,
    marginHorizontal: 12,
  },
});

export default Chip;
