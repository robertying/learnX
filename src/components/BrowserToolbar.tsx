import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, HStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  disabled,
  frame,
  glassEffect,
  labelStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';
import { t } from 'helpers/i18n';
import type { BrowserToolbarProps } from './BrowserToolbar.shared';
import DeviceInfo from 'constants/DeviceInfo';
import ThemedHost from 'components/ThemedHost';

export type { BrowserToolbarProps } from './BrowserToolbar.shared';

const liquidGlass = DeviceInfo.hasLiquidGlass();

// A capsule of Liquid Glass on iOS 26 (bar material before), like Safari's
// compact tab bar.
const capsuleModifiers = [
  padding({ horizontal: 6, vertical: 2 }),
  ...(liquidGlass
    ? [glassEffect({ glass: { variant: 'regular' }, shape: 'capsule' })]
    : [
        background({ type: 'material', material: 'bar' }),
        clipShape('capsule'),
      ]),
];

const MARGIN = 8;

/** The page's back, forward, reload and open buttons, floating at the bottom. */
const BrowserToolbar: React.FC<BrowserToolbarProps> = ({
  canGoBack,
  canGoForward,
  loading,
  onBack,
  onForward,
  onReload,
  onOpenInBrowser,
  onOverlapChange,
}) => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, MARGIN);

  const item = (
    systemImage: SFSymbol,
    label: string,
    isDisabled: boolean,
    onPress: () => void,
    testID: string,
  ) => (
    <Button
      systemImage={systemImage}
      label={label}
      onPress={onPress}
      testID={testID}
      modifiers={[
        labelStyle('iconOnly'),
        buttonStyle('borderless'),
        frame({ width: 48, height: 44 }),
        disabled(isDisabled),
      ]}
    />
  );

  return (
    <View
      style={[styles.container, { bottom }]}
      pointerEvents="box-none"
      onLayout={e =>
        onOverlapChange?.(e.nativeEvent.layout.height + bottom + MARGIN)
      }
    >
      <ThemedHost matchContents>
        <HStack spacing={4} modifiers={capsuleModifiers}>
          {item(
            'chevron.backward',
            t('back'),
            !canGoBack,
            onBack,
            'courseXBack',
          )}
          {item(
            'chevron.forward',
            t('forward'),
            !canGoForward,
            onForward,
            'courseXForward',
          )}
          {item(
            'arrow.clockwise',
            t('refresh'),
            loading,
            onReload,
            'courseXReload',
          )}
          {item(
            'safari',
            t('openInBrowser'),
            loading,
            onOpenInBrowser,
            'courseXOpen',
          )}
        </HStack>
      </ThemedHost>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default BrowserToolbar;
