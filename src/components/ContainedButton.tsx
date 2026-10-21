import { Platform, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Button, Host } from '@expo/ui';
import { buttonStyle } from '@expo/ui/swift-ui/modifiers';

export interface ContainedButtonProps {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Below iOS 26, @expo/ui falls back to a plain button for glass, so those keep
// the button's own filled style.
const modifiers =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26
    ? [buttonStyle('glassProminent')]
    : undefined;

/** The system's filled button, tinted with the theme's primary color. */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  onPress,
  style,
}) => {
  const theme = useTheme();

  return (
    <Host matchContents seedColor={theme.colors.primary} style={style}>
      <Button
        label={label}
        disabled={disabled}
        onPress={onPress}
        modifiers={modifiers}
      />
    </Host>
  );
};

export default ContainedButton;
