import { Button } from '@expo/ui';
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

/** The system's filled button, tinted with the theme's primary color. */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
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
        disabled={disabled}
        onPress={onPress}
        modifiers={sizes[size]}
      />
    </ThemedHost>
  );
};

export default ContainedButton;
