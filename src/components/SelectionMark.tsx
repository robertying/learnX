import { StyleSheet, View } from 'react-native';
import SystemIcon from 'components/SystemIcon';
import { useTheme } from 'theme';
import type { SelectionMarkProps } from './SelectionMark.shared';

export type { SelectionMarkProps } from './SelectionMark.shared';

/**
 * The mark on a card in selection mode. It only shows the state: the card
 * takes the tap. iOS, iPadOS and Mac draw the system's selection circle (SF
 * Symbols `circle` / `checkmark.circle.fill`, as in Mail and Files) as a plain
 * native view, cheap on every row; Android's is the Material checkbox
 * (`SelectionMark.android.tsx`).
 */
const SelectionMark: React.FC<SelectionMarkProps> = ({ checked }) => {
  const theme = useTheme();

  return (
    <View style={styles.ios} pointerEvents="none">
      <SystemIcon
        testID={checked ? 'icon-selected' : 'icon-unselected'}
        name={checked ? 'selected' : 'unselected'}
        size={22}
        color={checked ? theme.colors.primary : theme.colors.outline}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  ios: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SelectionMark;
