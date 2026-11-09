import { StyleSheet } from 'react-native';
import {
  HorizontalDivider,
  Host,
  VerticalDivider,
} from '@expo/ui/jetpack-compose';
import { useTheme } from 'theme';
import type { DividerProps } from './Divider.shared';

export type { DividerProps } from './Divider.shared';

/**
 * The Material 3 divider (Compose `HorizontalDivider` / `VerticalDivider`), in
 * the outline variant role of the palette seeded from the primary color.
 */
const Divider: React.FC<DividerProps> = ({ vertical, style }) => {
  const theme = useTheme();

  return (
    <Host
      matchContents={vertical ? { horizontal: true } : { vertical: true }}
      seedColor={theme.colors.primary}
      style={[styles.stretch, style]}
    >
      {vertical ? <VerticalDivider /> : <HorizontalDivider />}
    </Host>
  );
};

const styles = StyleSheet.create({
  stretch: {
    alignSelf: 'stretch',
  },
});

export default Divider;
