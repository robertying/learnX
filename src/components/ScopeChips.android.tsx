import { StyleSheet } from 'react-native';
import { FilterChip, Row, Text } from '@expo/ui/jetpack-compose';
import { horizontalScroll } from '@expo/ui/jetpack-compose/modifiers';
import type { ScopeChipsProps } from './ScopeChips.shared';
import ThemedHost from 'components/ThemedHost';

/**
 * One choice among a few as a row of Material 3 filter chips that scrolls
 * sideways when it doesn't fit, as Android's own search screens narrow their
 * results (Gmail, Files).
 */
const ScopeChips: React.FC<ScopeChipsProps> = ({
  titles,
  selectedIndex,
  onSelect,
}) => (
  <ThemedHost matchContents={{ vertical: true }} style={styles.host}>
    <Row
      horizontalArrangement={{ spacedBy: 8 }}
      modifiers={[horizontalScroll()]}
    >
      {titles.map((title, i) => (
        <FilterChip
          key={title}
          selected={i === selectedIndex}
          onClick={() => onSelect(i)}
        >
          <FilterChip.Label>
            <Text>{title}</Text>
          </FilterChip.Label>
        </FilterChip>
      ))}
    </Row>
  </ThemedHost>
);

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});

export default ScopeChips;
