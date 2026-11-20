import { View } from 'react-native';
import {
  Badge,
  BadgedBox,
  Icon,
  IconButton as ComposeIconButton,
  IconToggleButton,
} from '@expo/ui/jetpack-compose';
import {
  size as sizeModifier,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { iconDrawables } from 'assets/icons';
import { systemIcons } from 'helpers/systemIcons';
import {
  PADDING,
  spokenLabel,
  type IconButtonProps,
} from './IconButton.shared';
import ThemedHost from 'components/ThemedHost';
import { useMaterialTheme } from 'theme';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

/**
 * A Material 3 icon button in Jetpack Compose. A button with `pressed` is
 * Material's icon toggle button, which TalkBack says is on or off, filled
 * tonal while on.
 */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 24,
  pressed,
  badge,
  disabled,
  onPress,
  accessibilityLabel,
  testID,
  style,
}) => {
  const theme = useMaterialTheme();

  const glyph = (
    <Icon
      source={iconDrawables[systemIcons[icon].android]}
      size={size}
      contentDescription={spokenLabel({ accessibilityLabel, badge })}
    />
  );

  const modifiers = [
    // The default is 40 dp around a 24 dp icon.
    ...(size !== 24
      ? [sizeModifier(size + 2 * PADDING, size + 2 * PADDING)]
      : []),
    ...(testID ? [testIDModifier(testID)] : []),
  ];

  if (pressed !== undefined) {
    return (
      <View style={style}>
        <ThemedHost matchContents>
          <IconToggleButton
            checked={pressed}
            enabled={!disabled}
            onCheckedChange={() => onPress?.()}
            // The filled tonal button's colors while on.
            colors={{
              checkedContainerColor: theme.colors.secondaryContainer,
              checkedContentColor: theme.colors.onSecondaryContainer,
            }}
            modifiers={modifiers}
          >
            {glyph}
          </IconToggleButton>
        </ThemedHost>
      </View>
    );
  }

  return (
    <View style={style}>
      <ThemedHost matchContents>
        <ComposeIconButton
          enabled={!disabled}
          onClick={onPress}
          modifiers={modifiers}
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
        </ComposeIconButton>
      </ThemedHost>
    </View>
  );
};

export default IconButton;
