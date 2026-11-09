import { StyleSheet, View } from 'react-native';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  disabled as disabledModifier,
  font,
  frame,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import Badge from 'components/Badge';
import { useTheme } from 'theme';
import {
  PADDING,
  type IconButtonIcon,
  type IconButtonProps,
} from './IconButton.shared';

export type { IconButtonIcon, IconButtonProps } from './IconButton.shared';

// The same symbols as the native header items.
const symbols: Record<IconButtonIcon, SFSymbol> = {
  archive: 'archivebox',
  back: 'chevron.backward',
  checkAll: 'checkmark.circle.fill',
  close: 'xmark',
  download: 'arrow.down.to.line',
  exitFullscreen: 'arrow.down.right.and.arrow.up.left',
  filter: 'line.3.horizontal.decrease.circle',
  forward: 'chevron.forward',
  fullscreen: 'arrow.up.left.and.arrow.down.right',
  info: 'info.circle',
  openInNew: 'arrow.up.forward.app',
  preview: 'eye',
  refresh: 'arrow.clockwise',
  reorder: 'arrow.up.and.down',
  restore: 'arrow.up.bin',
  search: 'magnifyingglass',
  select: 'checklist',
  settings: 'gearshape',
  share: 'square.and.arrow.up',
  upload: 'arrow.up.circle',
};

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
  const theme = useTheme();
  const buttonSize = size + 2 * PADDING;

  return (
    <View style={style}>
      <Host matchContents seedColor={theme.colors.primary}>
        <Button
          systemImage={symbols[icon]}
          label={accessibilityLabel ?? ''}
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
      </Host>
      {badge && <Badge size={8} style={styles.badge} />}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: PADDING - 2,
    right: PADDING - 2,
  },
});

export default IconButton;
