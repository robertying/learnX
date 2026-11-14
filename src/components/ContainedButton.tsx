import { Button } from '@expo/ui';
import { Text } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  font,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';
import DeviceInfo from 'constants/DeviceInfo';
import ThemedHost from 'components/ThemedHost';
import type { ContainedButtonProps } from './ContainedButton.shared';

export type { ContainedButtonProps } from './ContainedButton.shared';

// Below iOS 26, @expo/ui falls back to a plain button for glass, so those keep
// the button's own filled style.
const glass = DeviceInfo.hasLiquidGlass()
  ? [buttonStyle('glassProminent')]
  : [];
const sizes = {
  regular: glass.length > 0 ? glass : undefined,
  large: [...glass, controlSize('large')],
};
/**
 * On a Mac the button would set its label in the macOS scale (13 pt), smaller
 * than the text around it and than a TextButton beside it
 * (components/TextButton), and it ignores a font given to the button itself.
 * So the label is a Text of its own in the iOS body size React Native `Text`
 * uses.
 */
const macLabelFont = [font({ size: 17 })];

/** The system's filled button, in the brand color (`primaryFill` on iOS). */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  size = 'regular',
  onPress,
  style,
  testID,
}) => {
  const mac = DeviceInfo.isMac();
  const theme = useTheme();
  const modifiers = [...(sizes[size] ?? []), tint(theme.colors.primaryFill)];
  return (
    <ThemedHost matchContents style={style}>
      <Button
        testID={testID}
        label={mac ? undefined : label}
        disabled={disabled}
        onPress={onPress}
        modifiers={modifiers}
      >
        {mac ? <Text modifiers={macLabelFont}>{label}</Text> : undefined}
      </Button>
    </ThemedHost>
  );
};

export default ContainedButton;
