import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HorizontalFloatingToolbar,
  Icon,
  IconButton,
} from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { iconDrawables } from 'assets/icons';
import { t } from 'helpers/i18n';
import { systemIcons } from 'helpers/systemIcons';
import type { BrowserToolbarProps } from './BrowserToolbar.shared';
import ThemedHost from 'components/ThemedHost';

export type { BrowserToolbarProps } from './BrowserToolbar.shared';

/**
 * The page's back, forward, reload and open buttons in a Material 3
 * horizontal floating toolbar, centered below the page (a WebView has no
 * content inset on Android, so it doesn't float over the page).
 */
const BrowserToolbar: React.FC<BrowserToolbarProps> = ({
  canGoBack,
  canGoForward,
  loading,
  onBack,
  onForward,
  onReload,
  onOpenInBrowser,
}) => {
  const insets = useSafeAreaInsets();

  const item = (
    icon: 'back' | 'forward' | 'refresh' | 'openInBrowser',
    label: string,
    enabled: boolean,
    onClick: () => void,
    id: string,
  ) => (
    <IconButton enabled={enabled} onClick={onClick} modifiers={[testID(id)]}>
      <Icon
        source={iconDrawables[systemIcons[icon].android]}
        size={24}
        contentDescription={label}
      />
    </IconButton>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <ThemedHost matchContents>
        <HorizontalFloatingToolbar>
          {item('back', t('back'), canGoBack, onBack, 'courseXBack')}
          {item(
            'forward',
            t('forward'),
            canGoForward,
            onForward,
            'courseXForward',
          )}
          {item('refresh', t('refresh'), !loading, onReload, 'courseXReload')}
          {item(
            'openInBrowser',
            t('openInBrowser'),
            !loading,
            onOpenInBrowser,
            'courseXOpen',
          )}
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
