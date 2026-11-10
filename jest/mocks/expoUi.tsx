import {
  Pressable,
  Text,
  TextInput as RNTextInput,
  View,
  ViewProps,
} from 'react-native';

/**
 * Stand-ins for the @expo/ui views the app uses, which render SwiftUI or
 * Jetpack Compose. They are plain views with the same props, so tests can
 * press a button, flip a switch (`fireEvent(switch, 'valueChange', true)`)
 * and find an SF Symbol by testID (`icon-<name>`).
 */
export const Host = ({ children, style }: ViewProps) => (
  <View style={style}>{children}</View>
);

export const Icon = ({ name }: { name: string }) => (
  <View testID={`icon-${name}`} />
);

export const Button = ({
  label,
  disabled,
  onPress,
}: {
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
  >
    <Text>{label}</Text>
  </Pressable>
);

export const Switch = ({
  value,
  onValueChange,
  disabled,
  label,
  testID,
}: {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  testID?: string;
}) => (
  <View
    testID={testID}
    accessible
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{ checked: value, disabled: !!disabled }}
    {...{ onValueChange: disabled ? undefined : onValueChange }}
  />
);

export const TextInput = ({
  defaultValue,
  onChangeText,
  accessibilityLabel,
  testID,
}: {
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  accessibilityLabel?: string;
  testID?: string;
}) => (
  <RNTextInput
    defaultValue={defaultValue}
    onChangeText={onChangeText}
    accessibilityLabel={accessibilityLabel}
    testID={testID}
  />
);
