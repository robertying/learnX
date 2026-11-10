import { StyleSheet, View } from 'react-native';
import { Button } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  disabled as disabledModifier,
  font,
  frame,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import Badge from 'components/Badge';
import { t } from 'helpers/i18n';
import {
  iconSymbols,
  PADDING,
  type IconButtonProps,
} from './IconButton.shared';
import ThemedHost from 'components/ThemedHost';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

/** An icon-only SwiftUI button with an SF Symbol, tinted with the theme. */
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
  // A borderless button reaches 44 pt, Apple's smallest tap target, beyond
  // its padding; a contained one is drawn at its size.
  const buttonSize = Math.max(
    size + 2 * PADDING,
    mode === 'contained' ? 0 : MIN_TARGET,
  );
  const badgeInset = (buttonSize - size) / 2 - 2;
  const label = badge
    ? `${accessibilityLabel ?? ''}, ${t('a11yNewBadge')}`
    : (accessibilityLabel ?? '');

  return (
    <View style={style}>
      <ThemedHost matchContents>
        <Button
          systemImage={iconSymbols[icon]}
          label={label}
          onPress={onPress}
          testID={testID}
          modifiers={[
            labelStyle('iconOnly'),
            ...(mode === 'contained'
              ? [buttonStyle('bordered'), buttonBorderShape('circle')]
              : [buttonStyle('borderless')]),
            // SF Symbols size with the font; this one draws about `size` tall.
            font({ size: Math.round(size * 0.85) }),
            frame({ width: buttonSize, height: buttonSize }),
            disabledModifier(!!disabled),
          ]}
        />
      </ThemedHost>
      {badge && (
        <Badge
          size={8}
          style={[styles.badge, { top: badgeInset, right: badgeInset }]}
        />
      )}
    </View>
  );
};

const MIN_TARGET = 44;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
  },
});

export default IconButton;
