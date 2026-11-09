import { View } from 'react-native';
import {
  Badge,
  BadgedBox,
  FilledTonalIconButton,
  Host,
  Icon,
  IconButton as ComposeIconButton,
} from '@expo/ui/jetpack-compose';
import {
  size as sizeModifier,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { t } from 'helpers/i18n';
import { useComposeColorOverrides, useTheme } from 'theme';
import {
  PADDING,
  type IconButtonIcon,
  type IconButtonProps,
} from './IconButton.shared';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

// Material Symbols (outlined, 24 dp) from src/assets/icons.
const icons: Record<IconButtonIcon, number> = {
  archive: require('../assets/icons/archive.xml'),
  back: require('../assets/icons/arrow_back.xml'),
  checkAll: require('../assets/icons/done_all.xml'),
  close: require('../assets/icons/close.xml'),
  download: require('../assets/icons/download.xml'),
  exitFullscreen: require('../assets/icons/fullscreen_exit.xml'),
  filter: require('../assets/icons/filter_list.xml'),
  forward: require('../assets/icons/arrow_forward.xml'),
  fullscreen: require('../assets/icons/fullscreen.xml'),
  info: require('../assets/icons/info.xml'),
  openInNew: require('../assets/icons/open_in_new.xml'),
  preview: require('../assets/icons/visibility.xml'),
  refresh: require('../assets/icons/refresh.xml'),
  reorder: require('../assets/icons/swap_vert.xml'),
  restore: require('../assets/icons/unarchive.xml'),
  search: require('../assets/icons/search.xml'),
  select: require('../assets/icons/checklist.xml'),
  settings: require('../assets/icons/settings.xml'),
  share: require('../assets/icons/share.xml'),
  upload: require('../assets/icons/upload_file.xml'),
};

/**
 * A Material 3 icon button in Jetpack Compose: standard, or filled tonal for
 * `contained`.
 */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 24,
  mode,
  badge,
  disabled,
  onPress,
  accessibilityLabel,
  testID,
  style,
}) => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();
  const Button =
    mode === 'contained' ? FilledTonalIconButton : ComposeIconButton;

  const glyph = (
    <Icon
      source={icons[icon]}
      size={size}
      contentDescription={
        badge && accessibilityLabel
          ? `${accessibilityLabel}, ${t('a11yNewBadge')}`
          : accessibilityLabel
      }
    />
  );

  return (
    <View style={style}>
      <Host
        matchContents
        seedColor={theme.colors.primary}
        colorOverrides={colorOverrides}
      >
        <Button
          enabled={!disabled}
          onClick={onPress}
          modifiers={[
            // The default is 40 dp around a 24 dp icon.
            ...(size !== 24
              ? [sizeModifier(size + 2 * PADDING, size + 2 * PADDING)]
              : []),
            ...(testID ? [testIDModifier(testID)] : []),
          ]}
        >
          {badge ? (
            <BadgedBox>
              <BadgedBox.Badge>
                <Badge />
              </BadgedBox.Badge>
              {glyph}
            </BadgedBox>
          ) : (
            glyph
          )}
        </Button>
      </Host>
    </View>
  );
};

export default IconButton;
