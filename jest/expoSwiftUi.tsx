import { ReactNode, useState, useSyncExternalStore } from 'react';
import {
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  ViewProps,
} from 'react-native';

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
export const Divider = () => <View />;
export const Circle = () => <View />;
export const RoundedRectangle = () => <View />;

export const Text = ({
  children,
  testID,
}: {
  children?: ReactNode;
  testID?: string;
}) => <RNText testID={testID}>{children}</RNText>;

export const Image = ({ systemName }: { systemName: string }) => (
  <View testID={`icon-${systemName}`} />
);

export const ProgressView = ({
  value,
  children,
}: {
  value?: number | null;
  children?: ReactNode;
}) => (
  <View
    testID="progress"
    accessible
    accessibilityRole="progressbar"
    accessibilityValue={
      value == null ? undefined : { min: 0, max: 100, now: value * 100 }
    }
  >
    {children}
  </View>
);

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
  icon,
  children,
}: {
  systemImage?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) => (
  <View>
    {systemImage ? <View testID={`icon-${systemImage}`} /> : null}
    {icon}
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
  label,
  onPress,
  role,
  testID,
  modifiers,
  children,
}: {
  label?: string;
  onPress?: () => void;
  role?: string;
  testID?: string;
  modifiers?: ({ disabled?: boolean } | undefined)[];
  children?: ReactNode;
}) => {
  const isDisabled = !!modifiers?.some(modifier => modifier?.disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={role}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      testID={testID}
      onPress={onPress}
    >
      {label ? <RNText>{label}</RNText> : null}
      {children}
    </Pressable>
  );
};

interface NativeState<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  /** Called with every new value, as the native state's worklet listener. */
  onChange: ((value: T) => void) | null;
}

const nativeState = <T,>(initial: T): NativeState<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  const state: NativeState<T> = {
    onChange: null,
    get: () => value,
    set: next => {
      value = next;
      listeners.forEach(listener => listener());
      state.onChange?.(next);
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return state;
};

/**
 * `useNativeState`: a value the native view reads and writes. The views below
 * subscribe to it, as the native ones observe it.
 */
export const useNativeState = <T,>(initial: T) =>
  useState(() => nativeState(initial))[0];

/** A plain text input showing the native state's text. */
export const TextField = ({
  text,
  placeholder,
  onTextChange,
  testID,
  modifiers,
}: {
  text: NativeState<string>;
  placeholder?: string;
  onTextChange?: (text: string) => void;
  testID?: string;
  modifiers?: ({ disabled?: boolean } | undefined)[];
}) => {
  const value = useSyncExternalStore(text.subscribe, text.get);
  return (
    <RNTextInput
      value={value}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      editable={!modifiers?.some(modifier => modifier?.disabled)}
      onChangeText={typed => {
        text.set(typed);
        onTextChange?.(typed);
      }}
      testID={testID}
    />
  );
};

export const Toggle = ({
  isOn,
  onIsOnChange,
  label,
  systemImage,
  testID,
  children,
}: {
  children?: ReactNode;
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
    {children}
  </View>
);
