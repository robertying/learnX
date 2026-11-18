import { StyleSheet, View } from 'react-native';
import Divider from 'components/Divider';
import IconButton from 'components/IconButton';
import Spacing from 'constants/Spacing';
import { useTheme } from 'theme';
import {
  browserToolbarItems,
  type BrowserToolbarProps,
} from './BrowserToolbar.shared';

export type { BrowserToolbarProps } from './BrowserToolbar.shared';

/**
 * The page's back, forward, reload and open buttons as a Windows command bar
 * below the page, on the header's background (it doesn't float over the
 * page, so the page needs no inset).
 */
const BrowserToolbar: React.FC<BrowserToolbarProps> = props => {
  const theme = useTheme();

  return (
    <View>
      <Divider />
      <View
        role="toolbar"
        style={[styles.bar, { backgroundColor: theme.colors.surfaceContainer }]}
      >
        {browserToolbarItems(props).map(item => (
          <IconButton
            key={item.icon}
            icon={item.icon}
            accessibilityLabel={item.label}
            disabled={item.disabled}
            onPress={item.onPress}
            testID={item.testID}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
  },
});

export default BrowserToolbar;
