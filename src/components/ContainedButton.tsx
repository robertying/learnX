import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Button } from '@expo/ui';
import { buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import ThemedHost from 'components/ThemedHost';

export interface ContainedButtonProps {
  label: string;
  disabled?: boolean;
  /**
   * `large` is the tall button at the bottom of a welcome or set-up page on
   * iOS and Mac; Android's filled button has one size.
   */
  size?: 'regular' | 'large';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Below iOS 26, @expo/ui falls back to a plain button for glass, so those keep
// the button's own filled style.
const glass = DeviceInfo.hasLiquidGlass()
  ? [buttonStyle('glassProminent')]
  : [];
const sizes = {
  regular: glass.length > 0 ? glass : undefined,
  large: Platform.OS === 'ios' ? [...glass, controlSize('large')] : undefined,
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
