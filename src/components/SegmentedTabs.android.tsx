import { StyleSheet, View } from 'react-native';
import {
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from 'theme';
import type { SegmentedTabsProps } from './SegmentedTabs.shared';
import ThemedHost from 'components/ThemedHost';

export type { SegmentedTabsProps } from './SegmentedTabs.shared';

/**
 * Tabs for a pager as a Material 3 `SingleChoiceSegmentedButtonRow`, with
 * equal-width segments across the column. It follows the page the pager
 * settles on; it doesn't track the swipe.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  titles,
  selectedIndex,
  onSelect,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface }]}>
      <ThemedHost matchContents={{ vertical: true }} style={styles.host}>
        <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
          {titles.map((title, i) => (
            <SegmentedButton
              key={title}
              selected={i === selectedIndex}
              onClick={() => onSelect(i)}
              modifiers={[weight(1)]}
            >
              <SegmentedButton.Label>
                <Text maxLines={1}>{title}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      </ThemedHost>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  host: {
    width: '100%',
  },
});

export default SegmentedTabs;
