import { ReactNode } from 'react';
import { Pressable, Text as RNText, View, ViewProps } from 'react-native';

/**
 * Stand-ins for the SwiftUI views of `@expo/ui/swift-ui` that the app renders
 * outside widgets (the settings `Form`). Plain views with the same props: a
 * button presses, a toggle is a switch (`fireEvent(toggle, 'valueChange',
 * true)`), and an SF Symbol is findable by testID (`icon-<name>`).
 */
const Box = ({ children, testID }: ViewProps & { children?: ReactNode }) => (
  <View testID={testID}>{children}</View>
);

export const Host = Box;
export const Form = Box;
export const HStack = Box;
export const VStack = Box;
export const ZStack = Box;
export const Spacer = () => null;
export const Circle = () => <View />;

export const Text = ({ children }: { children?: ReactNode }) => (
  <RNText>{children}</RNText>
);

export const Image = ({ systemName }: { systemName: string }) => (
  <View testID={`icon-${systemName}`} />
);

export const ProgressView = () => <View testID="progress" />;

export const Section = ({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) => (
  <View>
    {title ? <RNText>{title}</RNText> : null}
    {children}
    {footer}
  </View>
);

export const Label = ({
  systemImage,
  children,
}: {
  systemImage?: string;
  children?: ReactNode;
}) => (
  <View>
    {systemImage ? <View testID={`icon-${systemImage}`} /> : null}
    {children}
  </View>
);

export const LabeledContent = ({
  label,
  children,
}: {
  label?: ReactNode;
  children?: ReactNode;
}) => (
  <View>
    {label}
    {children}
  </View>
);

export const Button = ({
  onPress,
  role,
  testID,
  children,
}: {
  onPress?: () => void;
  role?: string;
  testID?: string;
  children?: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityHint={role}
    testID={testID}
    onPress={onPress}
  >
    {children}
  </Pressable>
);

export const Toggle = ({
  isOn,
  onIsOnChange,
  label,
  systemImage,
  testID,
}: {
  isOn?: boolean;
  onIsOnChange?: (isOn: boolean) => void;
  label?: string;
  systemImage?: string;
  testID?: string;
}) => (
  <View
    testID={testID}
    accessible
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{ checked: !!isOn }}
    {...{ onValueChange: onIsOnChange }}
  >
    {systemImage ? <View testID={`icon-${systemImage}`} /> : null}
  </View>
);
