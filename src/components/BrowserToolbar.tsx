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
import { systemIcons } from 'helpers/systemIcons';
import {
  browserToolbarItems,
  type BrowserToolbarProps,
} from './BrowserToolbar.shared';
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

const itemModifiers = [
  labelStyle('iconOnly'),
  buttonStyle('borderless'),
  frame({ width: 48, height: 44 }),
];

/** The page's back, forward, reload and open buttons, floating at the bottom. */
const BrowserToolbar: React.FC<BrowserToolbarProps> = props => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, MARGIN);

  return (
    <View
      style={[styles.container, { bottom }]}
      pointerEvents="box-none"
      onLayout={e =>
        props.onOverlapChange?.(e.nativeEvent.layout.height + bottom + MARGIN)
      }
    >
      <ThemedHost matchContents>
        <HStack spacing={4} modifiers={capsuleModifiers}>
          {browserToolbarItems(props).map(item => (
            <Button
              key={item.icon}
              systemImage={systemIcons[item.icon].ios}
              label={item.label}
              onPress={item.onPress}
              testID={item.testID}
              modifiers={[...itemModifiers, disabled(item.disabled)]}
            />
          ))}
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
