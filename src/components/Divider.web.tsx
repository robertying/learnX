import { StyleSheet, View } from 'react-native';
import { useTheme } from 'theme';
import type { DividerProps } from './Divider.shared';

export type { DividerProps } from './Divider.shared';

/**
 * A one-pixel line in Fluent's stroke color, between panes or sections; a
 * vertical one fills the height of its row.
 */
const Divider: React.FC<DividerProps> = ({ vertical, style }) => {
  const theme = useTheme();
  return (
    <View
      role="separator"
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: theme.colors.outlineVariant },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    alignSelf: 'stretch',
  },
  vertical: {
    width: 1,
    alignSelf: 'stretch',
  },
});

export default Divider;
