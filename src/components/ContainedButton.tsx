import { Button } from '@expo/ui';
import { HStack, ProgressView, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';
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
 * The system's filled button, tinted with the theme's primary color. While
 * loading, the system spinner sits before the label, which takes the
 * button's disabled style, as in Apple's own sign-in buttons.
 */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  loading,
  size = 'regular',
  onPress,
  style,
  testID,
}) => {
  return (
    <ThemedHost matchContents style={style}>
      <Button
        testID={testID}
        label={label}
        disabled={disabled || loading}
        onPress={onPress}
        modifiers={sizes[size]}
      >
        {loading ? (
          <HStack spacing={8}>
            <ProgressView />
            <Text>{label}</Text>
          </HStack>
        ) : undefined}
      </Button>
    </ThemedHost>
  );
};

export default ContainedButton;
