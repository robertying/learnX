import { StyleSheet, View } from 'react-native';
import { Icon } from '@expo/ui';
import ThemedHost from 'components/ThemedHost';
import { useTheme } from 'theme';
import type { SelectionMarkProps } from './SelectionMark.shared';

export type { SelectionMarkProps } from './SelectionMark.shared';

/**
 * The mark on a card in selection mode. It only shows the state: the card
 * takes the tap. iOS, iPadOS and Mac draw the system's selection circle (SF
 * Symbols `circle` / `checkmark.circle.fill`, as in Mail and Files); Android's
 * is the Material checkbox (`SelectionMark.android.tsx`).
 */
const SelectionMark: React.FC<SelectionMarkProps> = ({ checked }) => {
  const theme = useTheme();
  const color = checked ? theme.colors.primary : theme.colors.outline;

  return (
    <View style={styles.ios} pointerEvents="none">
      <ThemedHost matchContents>
        <Icon
          name={checked ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          color={color}
        />
      </ThemedHost>
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
