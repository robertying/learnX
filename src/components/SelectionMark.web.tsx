import { StyleSheet, View } from 'react-native';
import { Checkbox } from '@fluentui/react-components';
import type { SelectionMarkProps } from './SelectionMark.shared';

export type { SelectionMarkProps } from './SelectionMark.shared';

/**
 * The mark on a card in selection mode: Fluent's checkbox, as a Windows list
 * in multiple selection shows. It only shows the state: the card takes the
 * click.
 */
const SelectionMark: React.FC<SelectionMarkProps> = ({ checked }) => (
  <View
    style={styles.mark}
    pointerEvents="none"
    testID={checked ? 'icon-selected' : 'icon-unselected'}
  >
    <Checkbox checked={checked} tabIndex={-1} aria-hidden />
  </View>
);

const styles = StyleSheet.create({
  mark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SelectionMark;
