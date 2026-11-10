import { StyleSheet, View } from 'react-native';
import { Checkbox } from '@expo/ui/jetpack-compose';
import ThemedHost from 'components/ThemedHost';
import type { SelectionMarkProps } from './SelectionMark.shared';

export type { SelectionMarkProps } from './SelectionMark.shared';

/**
 * The mark on a card in selection mode: the Material 3 checkbox, in Compose.
 * It only shows the state (no `onCheckedChange`, so Compose doesn't make it
 * clickable): the card takes the tap and says the state to TalkBack.
 */
const SelectionMark: React.FC<SelectionMarkProps> = ({ checked }) => (
  <View
    style={styles.root}
    pointerEvents="none"
    accessible={false}
    importantForAccessibility="no-hide-descendants"
  >
    <ThemedHost matchContents>
      <Checkbox value={checked} />
    </ThemedHost>
  </View>
);

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SelectionMark;
