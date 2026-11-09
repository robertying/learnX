import { StyleSheet } from 'react-native';
import { HorizontalDivider, VerticalDivider } from '@expo/ui/jetpack-compose';
import type { DividerProps } from './Divider.shared';
import ThemedHost from 'components/ThemedHost';

export type { DividerProps } from './Divider.shared';

/**
 * The Material 3 divider (Compose `HorizontalDivider` / `VerticalDivider`), in
 * the outline variant role of the palette seeded from the primary color.
 */
const Divider: React.FC<DividerProps> = ({ vertical, style }) => {
  return (
    <ThemedHost
      matchContents={vertical ? { horizontal: true } : { vertical: true }}
      style={[styles.stretch, style]}
    >
      {vertical ? <VerticalDivider /> : <HorizontalDivider />}
    </ThemedHost>
  );
};

const styles = StyleSheet.create({
  stretch: {
    alignSelf: 'stretch',
  },
});

export default Divider;
