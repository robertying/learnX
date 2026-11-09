import {
  Children,
  isValidElement,
  ReactNode,
  useSyncExternalStore,
} from 'react';
import {
  Pressable,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  ViewProps,
} from 'react-native';
import { useNativeState as useSwiftUINativeState } from './expoSwiftUi';

/**
 * Stand-ins for the Jetpack Compose views of `@expo/ui/jetpack-compose`, for
 * the Android test run (jest/android.ts). Plain views with the same props: a
 * view whose modifiers make it tappable (`clickable`, `toggleable`,
 * `selectable`) is a pressable with the role and state Compose would give it,
 * buttons press through `onClick`, a dropdown shows its items only while
 * `expanded`, and an icon is findable by its content description.
 */

type Modifier =
  | {
      testID?: string;
      onPress?: () => void;
      role?: string;
      checked?: boolean;
      selected?: boolean;
      disabled?: boolean;
    }
  | undefined;

interface BoxProps {
  children?: ReactNode;
  modifiers?: Modifier[];
  testID?: string;
}

const fromModifiers = (modifiers: Modifier[] = []) =>
  Object.assign({}, ...modifiers.filter(Boolean)) as NonNullable<Modifier>;

const Box = ({ children, modifiers, testID }: BoxProps) => {
  const { onPress, role, checked, selected, disabled, ...rest } =
    fromModifiers(modifiers);
  const id = rest.testID ?? testID;
  if (!onPress) {
    return <View testID={id}>{children}</View>;
  }
  return (
    <Pressable
      testID={id}
      accessibilityRole={(role as 'button') ?? 'button'}
      accessibilityState={{ checked, selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
};

// Each slot its own component, as a parent tells its slots apart by type.
const slot = () => (props: BoxProps) => <Box {...props} />;

export const Host = ({
  children,
  style,
  accessibilityLabel,
}: ViewProps & { children?: ReactNode }) => (
  <View style={style} accessibilityLabel={accessibilityLabel}>
    {children}
  </View>
);
export const RNHostView = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);
export const Column = Box;
export const Row = Box;
export const LazyColumn = Box;
export const CompositionLocalProvider = Box;
export const HorizontalFloatingToolbar = Box;
export const SingleChoiceSegmentedButtonRow = Box;
export const PullToRefreshBox = Box;
export const Spacer = () => null;
export const HorizontalDivider = () => <View testID="divider" />;
export const VerticalDivider = () => <View testID="divider" />;

export const ListItem = Object.assign((props: BoxProps) => <Box {...props} />, {
  HeadlineContent: slot(),
  SupportingContent: slot(),
  LeadingContent: slot(),
  TrailingContent: slot(),
});

export const BadgedBox = Object.assign(
  (props: BoxProps) => <Box {...props} />,
  {
    Badge: slot(),
  },
);
export const Badge = () => <View testID="badge" />;

export const Text = ({ children }: { children?: ReactNode }) => (
  <RNText>{children}</RNText>
);

export const Icon = ({
  contentDescription,
}: {
  contentDescription?: string;
}) => <View testID="icon" accessibilityLabel={contentDescription} />;

const ComposeButton = ({
  onClick,
  enabled,
  modifiers,
  children,
}: BoxProps & { onClick?: () => void; enabled?: boolean }) => (
  <Pressable
    testID={fromModifiers(modifiers).testID}
    accessibilityRole="button"
    accessibilityState={{ disabled: enabled === false }}
    disabled={enabled === false}
    onPress={onClick}
  >
    {children}
  </Pressable>
);
export const IconButton = ComposeButton;
export const FilledTonalIconButton = ComposeButton;
export const TextButton = ComposeButton;

export const Switch = ({
  value,
  enabled,
}: {
  value: boolean;
  enabled?: boolean;
}) => (
  <View
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled: enabled === false }}
  />
);

export const RadioButton = ({ selected }: { selected: boolean }) => (
  <View accessibilityRole="radio" accessibilityState={{ checked: selected }} />
);

export const CircularProgressIndicator = () => <View testID="progress" />;

export const LinearProgressIndicator = ({
  progress,
}: {
  progress?: number;
}) => (
  <View
    testID="progress"
    accessibilityRole="progressbar"
    accessibilityValue={
      progress == null ? undefined : { min: 0, max: 100, now: progress * 100 }
    }
  />
);

export const useNativeState = useSwiftUINativeState;

type NativeState = ReturnType<typeof useSwiftUINativeState<string>>;

const Field = ({
  value,
  enabled,
  onValueChange,
  modifiers,
  children,
}: BoxProps & {
  value: NativeState;
  enabled?: boolean;
  onValueChange?: (text: string) => void;
}) => {
  const text = useSyncExternalStore(value.subscribe, value.get);
  return (
    <View>
      <RNTextInput
        value={text}
        editable={enabled !== false}
        onChangeText={typed => {
          value.set(typed);
          onValueChange?.(typed);
        }}
        testID={fromModifiers(modifiers).testID}
      />
      {children}
    </View>
  );
};
export const TextField = Object.assign(Field, { Placeholder: slot() });
export const OutlinedTextField = Field;

const Trigger = slot();
const Items = slot();
export const DropdownMenu = Object.assign(
  ({ expanded, children }: { expanded: boolean; children?: ReactNode }) => (
    <View>
      {Children.map(children, child =>
        isValidElement(child) && child.type === Items && !expanded
          ? null
          : child,
      )}
    </View>
  ),
  { Trigger, Items },
);

const MenuItem = ({
  onClick,
  selected,
  modifiers,
  children,
}: BoxProps & { onClick?: () => void; selected?: boolean }) => (
  <Pressable
    testID={fromModifiers(modifiers).testID}
    accessibilityRole="menuitem"
    accessibilityState={{ selected }}
    onPress={onClick}
  >
    {children}
  </Pressable>
);
export const DropdownMenuItem = Object.assign(MenuItem, { Text: slot() });
export const SelectableDropdownMenuItem = Object.assign(MenuItem, {
  LeadingIcon: slot(),
  Text: slot(),
  TrailingContent: slot(),
});

export const SegmentedButton = Object.assign(
  ({
    onClick,
    selected,
    children,
  }: BoxProps & { onClick?: () => void; selected?: boolean }) => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onClick}
    >
      {children}
    </Pressable>
  ),
  { Label: slot() },
);

/**
 * Material's range picker: Save picks the initial range as it was handed in
 * (UTC-midnight ISO days), Cancel dismisses.
 */
export const DateRangePickerDialog = ({
  initialStartDate,
  initialEndDate,
  confirmButtonLabel,
  dismissButtonLabel,
  onDateRangeSelected,
  onDismissRequest,
}: {
  initialStartDate?: string;
  initialEndDate?: string;
  confirmButtonLabel?: string;
  dismissButtonLabel?: string;
  onDateRangeSelected: (range: { start?: Date; end?: Date }) => void;
  onDismissRequest: () => void;
}) => (
  <View testID="date-range-picker">
    <RNText testID="date-range-start">{initialStartDate}</RNText>
    <RNText testID="date-range-end">{initialEndDate}</RNText>
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        onDateRangeSelected({
          start: initialStartDate ? new Date(initialStartDate) : undefined,
          end: initialEndDate ? new Date(initialEndDate) : undefined,
        })
      }
    >
      <RNText>{confirmButtonLabel}</RNText>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onDismissRequest}>
      <RNText>{dismissButtonLabel}</RNText>
    </Pressable>
  </View>
);

// Material color roles by name, so a test can tell which role a view uses.
export const useMaterialColors = () =>
  new Proxy({} as Record<string, string>, { get: (_, role) => String(role) });
