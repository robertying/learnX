import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HorizontalFloatingToolbar,
  Icon,
  IconButton,
} from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { iconDrawables } from 'assets/icons';
import { systemIcons } from 'helpers/systemIcons';
import {
  browserToolbarItems,
  type BrowserToolbarProps,
} from './BrowserToolbar.shared';
import ThemedHost from 'components/ThemedHost';

export type { BrowserToolbarProps } from './BrowserToolbar.shared';

/**
 * The page's back, forward, reload and open buttons in a Material 3
 * horizontal floating toolbar, centered below the page (a WebView has no
 * content inset on Android, so it doesn't float over the page).
 */
const BrowserToolbar: React.FC<BrowserToolbarProps> = props => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <ThemedHost matchContents>
        <HorizontalFloatingToolbar>
          {browserToolbarItems(props).map(item => (
            <IconButton
              key={item.icon}
              enabled={!item.disabled}
              onClick={item.onPress}
              modifiers={[testID(item.testID)]}
            >
              <Icon
                source={iconDrawables[systemIcons[item.icon].android]}
                size={24}
                contentDescription={item.label}
              />
            </IconButton>
          ))}
        </HorizontalFloatingToolbar>
      </ThemedHost>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 12,
  },
});

export default BrowserToolbar;
