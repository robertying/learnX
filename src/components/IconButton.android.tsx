import { View } from 'react-native';
import {
  Badge,
  BadgedBox,
  FilledTonalIconButton,
  Icon,
  IconButton as ComposeIconButton,
} from '@expo/ui/jetpack-compose';
import {
  size as sizeModifier,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { t } from 'helpers/i18n';
import { iconDrawables } from 'assets/icons';
import { systemIcons } from 'helpers/systemIcons';
import { PADDING, type IconButtonProps } from './IconButton.shared';
import ThemedHost from 'components/ThemedHost';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

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
  const Button =
    mode === 'contained' ? FilledTonalIconButton : ComposeIconButton;

  const glyph = (
    <Icon
      source={iconDrawables[systemIcons[icon].android]}
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
      <ThemedHost matchContents>
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
      </ThemedHost>
    </View>
  );
};

export default IconButton;
