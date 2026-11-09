import { StyleProp, ViewStyle } from 'react-native';
import { Button } from '@expo/ui';
import { buttonStyle } from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import ThemedHost from 'components/ThemedHost';

export interface ContainedButtonProps {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Below iOS 26, @expo/ui falls back to a plain button for glass, so those keep
// the button's own filled style.
const modifiers = DeviceInfo.hasLiquidGlass()
  ? [buttonStyle('glassProminent')]
  : undefined;

/** The system's filled button, tinted with the theme's primary color. */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  onPress,
  style,
}) => {
  return (
    <ThemedHost matchContents style={style}>
      <Button
        label={label}
        disabled={disabled}
        onPress={onPress}
        modifiers={modifiers}
      />
    </ThemedHost>
  );
};

export default ContainedButton;
