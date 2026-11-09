import { StyleSheet, View } from 'react-native';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';

export interface SegmentedTabsProps {
  titles: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accessibilityLabel?: string;
}

/**
 * Tabs for a pager as a SwiftUI segmented `Picker`, the system control for
 * switching between views of the same content (as in the App Store or Files).
 * It follows the page the pager settles on; it doesn't track the swipe.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  titles,
  selectedIndex,
  onSelect,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface }]}>
      <Host
        matchContents={{ vertical: true }}
        style={styles.host}
        seedColor={theme.colors.primary}
      >
        <Picker
          label={accessibilityLabel}
          selection={selectedIndex}
          onSelectionChange={onSelect}
          modifiers={[pickerStyle('segmented')]}
        >
          {titles.map((title, i) => (
            <Text key={title} modifiers={[tag(i)]}>
              {title}
            </Text>
          ))}
        </Picker>
      </Host>
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
