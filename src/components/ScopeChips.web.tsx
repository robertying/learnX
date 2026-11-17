import { StyleSheet, View } from 'react-native';
import { ToggleButton } from '@fluentui/react-components';
import Spacing from 'constants/Spacing';
import type { ScopeChipsProps } from './ScopeChips.shared';

/**
 * Search's scopes under the search box: a row of Fluent toggle buttons, the
 * selected one checked, as Windows apps filter results.
 */
const ScopeChips: React.FC<ScopeChipsProps> = ({
  titles,
  selectedIndex,
  onSelect,
}) => (
  <View style={styles.row} role="radiogroup">
    {titles.map((title, index) => (
      <ToggleButton
        key={title}
        shape="circular"
        size="small"
        checked={index === selectedIndex}
        role="radio"
        aria-checked={index === selectedIndex}
        onClick={() => onSelect(index)}
      >
        {title}
      </ToggleButton>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
});

export default ScopeChips;
