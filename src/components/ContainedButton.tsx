import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Button } from '@expo/ui';
import { buttonStyle, controlSize, font } from '@expo/ui/swift-ui/modifiers';
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
/**
 * On a Mac, the label's text style would switch to the macOS scale (body
 * 13 pt), smaller than the text around it and than a TextButton beside it
 * (components/TextButton), so it keeps the iOS body size React Native `Text`
 * uses.
 */
const macFont = DeviceInfo.isMac() ? [font({ size: 17 })] : [];
const regular = [...glass, ...macFont];
const sizes = {
  regular: regular.length > 0 ? regular : undefined,
  large: Platform.OS === 'ios' ? [...regular, controlSize('large')] : undefined,
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
