import { StyleSheet, Text, View } from 'react-native';
import { textStyles } from 'components/Text';
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
        dynamicTypeRamp="subheadline"
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
    ...textStyles.label,
    marginVertical: 6,
    marginHorizontal: 12,
  },
});

export default Chip;
