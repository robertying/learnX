import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from 'theme';

export interface ChipProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A small outlined label, like Material's compact outlined chip. Display only. */
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
