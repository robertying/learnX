import { StyleSheet, View } from 'react-native';
import { Tab, TabList } from '@fluentui/react-components';
import { useTheme } from 'theme';
import type { SegmentedTabsProps } from './SegmentedTabs.shared';

export type { SegmentedTabsProps } from './SegmentedTabs.shared';

/**
 * Tabs for a pager: Fluent's tab list, the underlined tabs Windows apps put
 * above views of the same content.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  titles,
  selectedIndex,
  onSelect,
  accessibilityLabel,
  testID,
}) => {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.bar, { backgroundColor: theme.colors.surface }]}
    >
      <TabList
        selectedValue={selectedIndex}
        onTabSelect={(_event, data) => onSelect(data.value as number)}
        aria-label={accessibilityLabel}
      >
        {titles.map((title, index) => (
          <Tab key={title} value={index}>
            {title}
          </Tab>
        ))}
      </TabList>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default SegmentedTabs;
