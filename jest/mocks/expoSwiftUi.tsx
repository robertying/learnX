import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  Ref,
  useImperativeHandle,
  useState,
  useSyncExternalStore,
} from 'react';
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
export const RNHostView = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);
export const Divider = () => <View />;
type ShapeProps = {
  modifiers?: ({ accessibilityLabel?: string } | undefined)[];
};
/** Findable by its accessibility label (e.g. the new-item badge). */
const Shape = ({ modifiers }: ShapeProps) => {
  const label = modifiers?.find(m => m?.accessibilityLabel)?.accessibilityLabel;
  return <View accessible={!!label} accessibilityLabel={label} />;
};
export const Circle = Shape;
export const RoundedRectangle = () => <View />;

// Passes its modifiers on as a prop, like the Button stand-in.
export const Text = ({
  children,
  modifiers,
  testID,
}: {
  children?: ReactNode;
  modifiers?: unknown[];
  testID?: string;
}) => (
  <RNText testID={testID} {...{ modifiers }}>
    {children}
  </RNText>
);

export const Image = ({
  systemName,
  modifiers,
}: {
  systemName: string;
  modifiers?: unknown[];
}) => <View testID={`icon-${systemName}`} {...{ modifiers }} />;

type ModifierList = (
  | { disabled?: boolean; modifier?: string; args?: unknown[] }
  | undefined
)[];

/** Whether `accessibilityAddTraits` gave the view this trait. */
const hasTrait = (modifiers: ModifierList | undefined, trait: string) =>
  !!modifiers?.some(
    m =>
      m?.modifier === 'accessibilityAddTraits' &&
      (m.args?.[0] as string[] | undefined)?.includes(trait),
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
  header,
  footer,
  children,
}: {
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) => (
  <View>
    {title ? <RNText>{title}</RNText> : null}
    {header}
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
  modifiers?: ModifierList;
  children?: ReactNode;
}) => {
  const isDisabled = !!modifiers?.some(modifier => modifier?.disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={role}
      accessibilityState={{
        disabled: isDisabled,
        selected: hasTrait(modifiers, 'isSelected'),
      }}
      disabled={isDisabled}
      testID={testID}
      onPress={onPress}
      {...{ modifiers }}
    >
      {label ? <RNText>{label}</RNText> : null}
      {children}
    </Pressable>
  );
};

const Slot = ({ children }: { children?: ReactNode }) => <>{children}</>;

/**
 * Shows its trigger, and while presented its title, message, actions and a
 * Cancel button; an action or Cancel dismisses it, as SwiftUI does.
 */
export const ConfirmationDialog = Object.assign(
  ({
    title,
    isPresented,
    onIsPresentedChange,
    children,
  }: {
    title: string;
    isPresented?: boolean;
    onIsPresentedChange?: (value: boolean) => void;
    children?: ReactNode;
  }) => {
    const slots = Children.toArray(children).filter(
      isValidElement,
    ) as ReactElement<{ children?: ReactNode }>[];
    const slot = (type: unknown) =>
      slots.find(element => element.type === type)?.props.children;
    const dismiss = () => onIsPresentedChange?.(false);
    const actions = Children.toArray(slot(ConfirmationDialogActions))
      .filter(isValidElement)
      .map(action => {
        const button = action as ReactElement<{ onPress?: () => void }>;
        return cloneElement(button, {
          onPress: () => {
            button.props.onPress?.();
            dismiss();
          },
        });
      });
    return (
      <View>
        {slot(ConfirmationDialogTrigger)}
        {isPresented ? (
          <View testID="confirmation-dialog">
            <RNText>{title}</RNText>
            {slot(ConfirmationDialogMessage)}
            {actions}
            <Pressable accessibilityRole="button" onPress={dismiss}>
              <RNText>Cancel</RNText>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  },
  {} as {
    Trigger: typeof Slot;
    Actions: typeof Slot;
    Message: typeof Slot;
  },
);
const ConfirmationDialogTrigger = (props: { children?: ReactNode }) => (
  <Slot {...props} />
);
const ConfirmationDialogActions = (props: { children?: ReactNode }) => (
  <Slot {...props} />
);
const ConfirmationDialogMessage = (props: { children?: ReactNode }) => (
  <Slot {...props} />
);
ConfirmationDialog.Trigger = ConfirmationDialogTrigger;
ConfirmationDialog.Actions = ConfirmationDialogActions;
ConfirmationDialog.Message = ConfirmationDialogMessage;

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

/**
 * A plain text input showing the native state's text. The return key runs
 * the `onSubmit` modifier's handler, and the ref's `focus` is a `jest.fn`.
 */
export const TextField = ({
  text,
  placeholder,
  onTextChange,
  testID,
  modifiers,
  ref,
  secure,
}: {
  text: NativeState<string>;
  placeholder?: string;
  onTextChange?: (text: string) => void;
  testID?: string;
  modifiers?: (
    | {
        disabled?: boolean;
        accessibilityLabel?: string;
        modifier?: string;
        args?: unknown[];
      }
    | undefined
  )[];
  ref?: Ref<{ focus: () => void }>;
  secure?: boolean;
}) => {
  const value = useSyncExternalStore(text.subscribe, text.get);
  const [focus] = useState(() => jest.fn());
  useImperativeHandle(ref, () => ({ focus }));
  const submit = modifiers?.find(modifier => modifier?.modifier === 'onSubmit')
    ?.args?.[0] as (() => void) | undefined;
  return (
    <RNTextInput
      value={value}
      placeholder={placeholder}
      // SwiftUI names a field by its placeholder unless it's given a label
      accessibilityLabel={
        modifiers?.find(modifier => modifier?.accessibilityLabel)
          ?.accessibilityLabel ?? placeholder
      }
      secureTextEntry={secure}
      editable={!modifiers?.some(modifier => modifier?.disabled)}
      onChangeText={typed => {
        text.set(typed);
        onTextChange?.(typed);
      }}
      onSubmitEditing={submit}
      {...{ focus }}
      testID={testID}
    />
  );
};

export const SecureField = (props: Parameters<typeof TextField>[0]) => (
  <TextField {...props} secure />
);

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

export const Picker = ({
  label,
  children,
}: {
  label?: string;
  children?: ReactNode;
}) => (
  <View accessibilityRole="tablist" accessibilityLabel={label}>
    {children}
  </View>
);

// The date range sheet (components/DateRangePicker): the sheet shows its
// content only while presented (swipe it down with
// `fireEvent(sheet, 'isPresentedChange', false)`), and a date picker is a
// view named by its title that shows its date (pick one with
// `fireEvent(picker, 'dateChange', date)`).
export const BottomSheet = ({
  isPresented,
  children,
}: {
  isPresented: boolean;
  onIsPresentedChange?: (isPresented: boolean) => void;
  children?: ReactNode;
}) => <View testID="bottom-sheet">{isPresented ? children : null}</View>;
export const NavigationStack = Box;
export const Toolbar = Object.assign(Box, { Content: Box });
export const ToolbarItem = Box;
export const DatePicker = ({
  title,
  selection,
}: {
  title?: string;
  selection?: Date;
  onDateChange?: (date: Date) => void;
}) => (
  <View testID={`date-picker-${title}`}>
    <RNText>{selection?.toISOString().slice(0, 10)}</RNText>
  </View>
);
