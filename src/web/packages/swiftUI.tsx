import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  type PressableStateCallbackType,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as RNText,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useFonts } from 'expo-font';
import regular from 'expo-symbols/androidWeights/regular';
import { t } from 'helpers/i18n';
import { materialCodepoints, systemIcons } from 'helpers/systemIcons';
import { useTheme } from 'theme';

/**
 * Stands in for @expo/ui's SwiftUI views in the Electron app, which has no
 * SwiftUI: React Native views that lay out, read and act as the iOS
 * components expect, in the theme's colors. Minimal on purpose: the Fluent
 * versions of those components replace them (phase 3 of the plan).
 */

/** What a modifier from the stand-in modifiers module (swiftUIModifiers.js) records. */
interface Modifier {
  $type: string;
  $args: unknown[];
}

interface ModifierProps {
  modifiers?: Modifier[];
  testID?: string;
}

const textStyles: Record<string, number> = {
  largeTitle: 28,
  title: 24,
  title2: 20,
  title3: 18,
  headline: 15,
  body: 15,
  callout: 14,
  subheadline: 14,
  footnote: 13,
  caption: 12,
  caption2: 11,
};

const weights: Record<string, TextStyle['fontWeight']> = {
  ultraLight: '200',
  thin: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
};

type Edges = {
  all?: number;
  horizontal?: number;
  vertical?: number;
  top?: number;
  bottom?: number;
  leading?: number;
  trailing?: number;
};

type Writable<T> = { -readonly [K in keyof T]: T[K] };

/** What the web can take from a list of modifiers. */
export interface ReadModifiers {
  style: Writable<ViewStyle>;
  textStyle: Writable<TextStyle>;
  disabled: boolean;
  lineLimit?: number;
  onSubmit?: () => void;
  accessibilityLabel?: string;
  buttonStyle?: string;
  iconOnly: boolean;
  tag?: unknown;
}

const isColor = (value: unknown): value is string => typeof value === 'string';

export const readModifiers = (modifiers: Modifier[] = []): ReadModifiers => {
  const read: ReadModifiers = {
    style: {},
    textStyle: {},
    disabled: false,
    iconOnly: false,
  };
  for (const { $type: type, $args: args } of modifiers) {
    const [first, second] = args;
    switch (type) {
      case 'padding': {
        const edges: Edges =
          typeof first === 'number'
            ? { all: first }
            : ((first as Edges | undefined) ?? { all: 8 });
        Object.assign(read.style, {
          padding: edges.all,
          paddingHorizontal: edges.horizontal,
          paddingVertical: edges.vertical,
          paddingTop: edges.top,
          paddingBottom: edges.bottom,
          paddingLeft: edges.leading,
          paddingRight: edges.trailing,
        });
        break;
      }
      case 'frame': {
        const frame = (first ?? {}) as Record<string, number | undefined>;
        for (const key of [
          'width',
          'height',
          'minWidth',
          'minHeight',
          'maxWidth',
          'maxHeight',
        ] as const) {
          const value = frame[key];
          if (value !== undefined && Number.isFinite(value)) {
            read.style[key] = value;
          } else if (value === Infinity && key === 'maxWidth') {
            read.style.alignSelf = 'stretch';
          }
        }
        break;
      }
      case 'foregroundStyle':
        if (isColor(first)) {
          read.textStyle.color = first;
        }
        break;
      case 'background':
        if (isColor(first)) {
          read.style.backgroundColor = first;
        }
        break;
      case 'font': {
        const font = (first ?? {}) as {
          size?: number;
          textStyle?: string;
          weight?: string;
        };
        const size = font.size ?? textStyles[font.textStyle ?? ''];
        if (size) {
          read.textStyle.fontSize = size;
        }
        if (font.weight) {
          read.textStyle.fontWeight = weights[font.weight];
        } else if (font.textStyle === 'headline') {
          read.textStyle.fontWeight = '600';
        }
        break;
      }
      case 'opacity':
        read.style.opacity = first as number;
        break;
      case 'disabled':
        read.disabled = !!first;
        break;
      case 'lineLimit':
        if (typeof first === 'number') {
          read.lineLimit = first;
        }
        break;
      case 'strikethrough':
        if ((first as { isActive?: boolean } | undefined)?.isActive) {
          read.textStyle.textDecorationLine = 'line-through';
        }
        break;
      case 'onSubmit':
        read.onSubmit = first as () => void;
        break;
      case 'accessibilityLabel':
        read.accessibilityLabel = first as string;
        break;
      case 'clipShape':
        read.style.overflow = 'hidden';
        read.style.borderRadius =
          first === 'circle' || first === 'capsule'
            ? 9999
            : ((second as number | undefined) ?? 8);
        break;
      case 'buttonStyle':
        read.buttonStyle = first as string;
        break;
      case 'labelStyle':
        read.iconOnly = first === 'iconOnly';
        break;
      case 'tag':
        read.tag = first;
        break;
    }
  }
  return read;
};

/** The tint, from the nearest Host's seed color. */
const TintContext = createContext<ColorValue | null>(null);
/** Text style inherited from the views around, as SwiftUI's environment. */
const TextStyleContext = createContext<TextStyle>({});
/** The stack a view is in, for Divider's direction. */
const AxisContext = createContext<'horizontal' | 'vertical'>('vertical');

const useTint = () => {
  const theme = useTheme();
  return useContext(TintContext) ?? theme.colors.primary;
};

export interface HostProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  seedColor?: ColorValue;
  matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
  testID?: string;
}

export const Host = ({ children, style, seedColor, testID }: HostProps) => (
  <TintContext value={seedColor ?? null}>
    <View style={style} testID={testID}>
      {children}
    </View>
  </TintContext>
);

interface StackProps extends ModifierProps {
  children?: ReactNode;
  spacing?: number;
  alignment?: string;
}

const alignments: Record<string, ViewStyle['alignItems']> = {
  leading: 'flex-start',
  top: 'flex-start',
  center: 'center',
  trailing: 'flex-end',
  bottom: 'flex-end',
};

/** A stack's own text style, passed on to the text inside. */
const InheritedText = ({
  textStyle,
  children,
}: {
  textStyle: TextStyle;
  children: ReactNode;
}) => {
  const outer = useContext(TextStyleContext);
  return (
    <TextStyleContext value={{ ...outer, ...textStyle }}>
      {children}
    </TextStyleContext>
  );
};

export const VStack = ({
  children,
  spacing = 4,
  alignment,
  modifiers,
  testID,
}: StackProps) => {
  const read = readModifiers(modifiers);
  return (
    <AxisContext value="vertical">
      <InheritedText textStyle={read.textStyle}>
        <View
          testID={testID}
          style={[
            styles.vStack,
            { gap: spacing },
            alignment ? { alignItems: alignments[alignment] } : null,
            read.style,
          ]}
        >
          {children}
        </View>
      </InheritedText>
    </AxisContext>
  );
};

export const HStack = ({
  children,
  spacing = 8,
  alignment,
  modifiers,
  testID,
}: StackProps) => {
  const read = readModifiers(modifiers);
  return (
    <AxisContext value="horizontal">
      <InheritedText textStyle={read.textStyle}>
        <View
          testID={testID}
          style={[
            styles.hStack,
            { gap: spacing },
            alignment ? { alignItems: alignments[alignment] } : null,
            read.style,
          ]}
        >
          {children}
        </View>
      </InheritedText>
    </AxisContext>
  );
};

export const ZStack = ({ children, modifiers, testID }: StackProps) => {
  const read = readModifiers(modifiers);
  const [base, ...layers] = Children.toArray(children);
  return (
    <InheritedText textStyle={read.textStyle}>
      <View testID={testID} style={[styles.zStack, read.style]}>
        {base}
        {layers.map(layer => (
          <View
            key={keyOf(layer)}
            style={[StyleSheet.absoluteFill, styles.centered]}
          >
            {layer}
          </View>
        ))}
      </View>
    </InheritedText>
  );
};

export const Spacer = () => <View style={styles.fill} />;

export const Text = ({
  children,
  modifiers,
  testID,
}: ModifierProps & { children?: ReactNode }) => {
  const theme = useTheme();
  const inherited = useContext(TextStyleContext);
  const read = readModifiers(modifiers);
  return (
    <RNText
      testID={testID}
      numberOfLines={read.lineLimit}
      style={[
        styles.text,
        { color: theme.colors.onSurface },
        inherited,
        read.style,
        read.textStyle,
      ]}
    >
      {children}
    </RNText>
  );
};

/** SF Symbols the components name outside `helpers/systemIcons`. */
const extraCodepoints: Record<string, number> = {
  // Material's chevron_right
  'chevron.right': 0xe5cc,
};
const materialCodepointsBySymbol = new Map<string, number>(
  Object.values(systemIcons).map(icon => [
    icon.ios,
    materialCodepoints[icon.android],
  ]),
);

/** An SF Symbol's Material Symbols glyph, if the app has one for it. */
export const symbolGlyph = (systemName: string) => {
  const codepoint =
    extraCodepoints[systemName] ?? materialCodepointsBySymbol.get(systemName);
  return codepoint ? String.fromCharCode(codepoint) : '';
};

// The Material Symbols font Android's icons use (SystemIcon.android.tsx).
const symbolFonts = { [regular.name]: regular.font };

export const Image = ({
  systemName,
  size,
  color,
  modifiers,
  testID,
}: ModifierProps & {
  systemName: string;
  size?: number;
  color?: ColorValue;
}) => {
  const [loaded] = useFonts(symbolFonts);
  const inherited = useContext(TextStyleContext);
  const read = readModifiers(modifiers);
  const fontSize = size ?? read.textStyle.fontSize ?? inherited.fontSize ?? 18;
  return (
    <RNText
      testID={testID}
      aria-hidden
      style={[
        styles.symbol,
        { color: inherited.color },
        read.textStyle,
        { fontSize, lineHeight: fontSize, fontFamily: regular.name },
        color ? { color } : null,
      ]}
    >
      {loaded ? symbolGlyph(systemName) : ''}
    </RNText>
  );
};

export const Label = ({
  title,
  systemImage,
  children,
  modifiers,
}: ModifierProps & {
  title?: string;
  systemImage?: string;
  children?: ReactNode;
}) => (
  <HStack modifiers={modifiers}>
    {systemImage ? <Image systemName={systemImage} /> : null}
    {typeof (children ?? title) === 'string' ? (
      <Text>{children ?? title}</Text>
    ) : (
      children
    )}
  </HStack>
);

const ButtonContext = createContext(false);

/** Pressable's state, with the hover React Native Web adds. */
type PressState = PressableStateCallbackType & { hovered?: boolean };

export const Button = ({
  label,
  systemImage,
  onPress,
  role,
  children,
  modifiers,
  testID,
}: ModifierProps & {
  label?: string;
  systemImage?: string;
  onPress?: () => void;
  role?: 'destructive' | 'cancel';
  children?: ReactNode;
}) => {
  const theme = useTheme();
  const tint = useTint();
  const read = readModifiers(modifiers);
  const filled =
    read.buttonStyle === 'borderedProminent' ||
    read.buttonStyle === 'glassProminent';
  const bordered =
    read.buttonStyle === 'bordered' || read.buttonStyle === 'glass';
  // A row in a Form (a Button around a stack) keeps its own text colors.
  const row = useContext(ButtonContext) || !(label || systemImage);
  const color =
    role === 'destructive'
      ? theme.colors.error
      : filled
        ? theme.colors.onPrimary
        : tint;
  return (
    <Pressable
      testID={testID}
      role="button"
      aria-label={read.accessibilityLabel ?? label}
      disabled={read.disabled}
      onPress={onPress}
      style={({ hovered, pressed }: PressState) => [
        filled || bordered ? styles.button : null,
        filled && { backgroundColor: tint },
        bordered && { backgroundColor: theme.colors.surfaceDisabled },
        row && styles.row,
        (hovered || pressed) && { opacity: pressed ? 0.6 : 0.8 },
        read.disabled && styles.disabled,
        read.style,
      ]}
    >
      <ButtonContext value>
        <InheritedText
          textStyle={{ ...(row ? {} : { color }), ...read.textStyle }}
        >
          {children ?? (
            <HStack spacing={6}>
              {systemImage ? <Image systemName={systemImage} /> : null}
              {label && !read.iconOnly ? <Text>{label}</Text> : null}
            </HStack>
          )}
        </InheritedText>
      </ButtonContext>
    </Pressable>
  );
};

export const Divider = ({ modifiers }: ModifierProps) => {
  const theme = useTheme();
  const axis = useContext(AxisContext);
  const read = readModifiers(modifiers);
  return (
    <View
      style={[
        axis === 'horizontal' ? styles.verticalRule : styles.horizontalRule,
        { backgroundColor: theme.colors.outlineVariant },
        read.style,
      ]}
    />
  );
};

export const Circle = ({ modifiers }: ModifierProps) => {
  const read = readModifiers(modifiers);
  return (
    <View
      style={[
        styles.circle,
        { backgroundColor: read.textStyle.color },
        read.style,
      ]}
    />
  );
};

export const ProgressView = ({
  value,
  children,
  testID,
}: ModifierProps & { value?: number | null; children?: ReactNode }) => {
  const theme = useTheme();
  const tint = useTint();
  return (
    <View testID={testID} style={styles.progress}>
      {value == null ? (
        <ActivityIndicator color={tint} />
      ) : (
        <View
          role="progressbar"
          aria-valuenow={Math.round(value * 100)}
          style={[
            styles.track,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        >
          <View
            style={[
              styles.bar,
              { width: `${value * 100}%`, backgroundColor: tint },
            ]}
          />
        </View>
      )}
      {children}
    </View>
  );
};

export const LabeledContent = ({
  label,
  children,
  testID,
}: ModifierProps & { label: ReactNode; children?: ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID={testID} style={styles.hStack}>
      <View style={styles.fill}>
        {typeof label === 'string' ? <Text>{label}</Text> : label}
      </View>
      <InheritedText textStyle={{ color: theme.colors.onSurfaceVariant }}>
        {children}
      </InheritedText>
    </View>
  );
};

export const RNHostView = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);

/** A child's key from `Children.toArray`, or its text. */
const keyOf = (node: ReactNode) =>
  isValidElement(node)
    ? node.key
    : typeof node === 'string' || typeof node === 'number'
      ? String(node)
      : null;

const Fragment = (<></>).type;

/**
 * The rows of a section with a key each: fragments and arrays flattened, and
 * a nested child's key prefixed with its fragment's.
 */
const rowsOf = (children: ReactNode, prefix = ''): [string, ReactNode][] =>
  Children.toArray(children).flatMap(child =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? rowsOf(child.props.children, `${prefix}${child.key}`)
      : [[`${prefix}${keyOf(child)}`, child] as [string, ReactNode]],
  );

export const Section = ({
  title,
  header,
  footer,
  children,
}: ModifierProps & {
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) => {
  const theme = useTheme();
  const rows = rowsOf(children);
  return (
    <View style={styles.section}>
      {title ? (
        <RNText
          style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        >
          {title}
        </RNText>
      ) : (
        header
      )}
      {rows.length > 0 && (
        <View
          style={[
            styles.rows,
            {
              backgroundColor: theme.colors.surfaceContainer,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {rows.map(([key, row], i) => (
            <View
              key={key}
              style={[
                styles.formRow,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              {row}
            </View>
          ))}
        </View>
      )}
      {footer ? (
        <InheritedText
          textStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
        >
          <View style={styles.footer}>{footer}</View>
        </InheritedText>
      ) : null}
    </View>
  );
};

export const Form = ({
  children,
  testID,
}: ModifierProps & { children?: ReactNode }) => {
  const theme = useTheme();
  return (
    <ScrollView
      testID={testID}
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.form}
    >
      <View style={styles.formColumn}>{children}</View>
    </ScrollView>
  );
};

/** A value held "natively", which views and JS both read and write. */
export interface NativeState<T> {
  get(): T;
  set(value: T): void;
  /** Called with each value a view writes (a typed key). */
  onChange: ((value: T) => void) | null;
  subscribe(listener: () => void): () => void;
}

export const createNativeState = <T,>(initial: T): NativeState<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: next => {
      value = next;
      listeners.forEach(listener => listener());
    },
    onChange: null,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useNativeState = <T,>(initial: T) =>
  useState(() => createNativeState(initial))[0];

export interface SecureFieldRef {
  focus(): Promise<void>;
  blur(): Promise<void>;
}

interface FieldProps extends ModifierProps {
  ref?: Ref<SecureFieldRef>;
  text: NativeState<string>;
  placeholder?: string;
  axis?: 'horizontal' | 'vertical';
  secure?: boolean;
}

const Field = ({
  ref,
  text,
  placeholder,
  axis,
  secure,
  modifiers,
  testID,
}: FieldProps) => {
  const theme = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useImperativeHandle(ref, () => ({
    focus: async () => input.current?.focus(),
    blur: async () => input.current?.blur(),
  }));
  const value = useSyncExternalStore(
    listener => text.subscribe(listener),
    () => text.get(),
  );
  const read = readModifiers(modifiers);
  return (
    <TextInput
      ref={input}
      testID={testID}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.onSurfaceDisabled}
      secureTextEntry={secure}
      multiline={axis === 'vertical'}
      aria-label={read.accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      editable={!read.disabled}
      onChangeText={typed => {
        text.set(typed);
        text.onChange?.(typed);
      }}
      onSubmitEditing={read.onSubmit}
      style={[
        styles.field,
        { color: theme.colors.onSurface },
        read.style,
        read.textStyle,
      ]}
    />
  );
};

export const TextField = (props: Omit<FieldProps, 'secure'>) => (
  <Field {...props} />
);

export const SecureField = (props: Omit<FieldProps, 'secure' | 'axis'>) => (
  <Field {...props} secure />
);

export const Toggle = ({
  isOn,
  onIsOnChange,
  label,
  children,
  modifiers,
  testID,
}: ModifierProps & {
  isOn: boolean;
  onIsOnChange?: (isOn: boolean) => void;
  label?: string;
  children?: ReactNode;
}) => {
  const tint = useTint();
  const read = readModifiers(modifiers);
  return (
    <View style={styles.hStack}>
      <View style={styles.fill}>
        {typeof (children ?? label) === 'string' ? (
          <Text>{children ?? label}</Text>
        ) : (
          children
        )}
      </View>
      <Switch
        testID={testID}
        value={isOn}
        disabled={read.disabled}
        aria-label={read.accessibilityLabel ?? label}
        onValueChange={onIsOnChange}
        trackColor={{ true: tint, false: undefined }}
      />
    </View>
  );
};

export const Picker = ({
  label,
  selection,
  onSelectionChange,
  children,
  testID,
}: ModifierProps & {
  label?: string;
  selection?: unknown;
  onSelectionChange?: (selection: never) => void;
  children?: ReactNode;
}) => {
  const theme = useTheme();
  const options = Children.toArray(children).filter(
    (child): child is ReactElement<ModifierProps & { children?: ReactNode }> =>
      isValidElement(child),
  );
  return (
    <View
      testID={testID}
      role="tablist"
      aria-label={label}
      style={[styles.picker, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      {options.map((option, i) => {
        const tag = readModifiers(option.props.modifiers).tag ?? i;
        const selected = tag === selection;
        return (
          <Pressable
            key={option.key}
            role="tab"
            aria-selected={selected}
            onPress={() => onSelectionChange?.(tag as never)}
            style={[
              styles.pickerOption,
              selected && { backgroundColor: theme.colors.surfaceContainer },
            ]}
          >
            <RNText
              style={[
                styles.pickerText,
                { color: theme.colors.onSurface },
                selected && styles.selectedText,
              ]}
            >
              {option.props.children}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
};

const dateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const DatePicker = ({
  title,
  selection,
  range,
  onDateChange,
  testID,
}: ModifierProps & {
  title?: string;
  selection: Date;
  range?: { start?: Date; end?: Date };
  displayedComponents?: string[];
  onDateChange?: (date: Date) => void;
}) => (
  <LabeledContent label={title ?? ''}>
    <TextInput
      testID={testID}
      // React Native Web passes the type on to the input element.
      {...({ type: 'date' } as object)}
      value={dateValue(selection)}
      aria-label={title}
      onChangeText={text => {
        const [year, month, day] = text.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (
          !Number.isNaN(date.getTime()) &&
          !(range?.start && date < range.start)
        ) {
          onDateChange?.(date);
        }
      }}
    />
  </LabeledContent>
);

/** A modal panel over the window, as sheets and dialogs present. */
const Panel = ({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) => {
  const theme = useTheme();
  return (
    <Modal transparent visible={visible} onRequestClose={onDismiss}>
      <Pressable
        style={[styles.backdrop, StyleSheet.absoluteFill]}
        onPress={onDismiss}
        aria-label={t('cancel')}
      />
      <View style={styles.panelHolder} pointerEvents="box-none">
        <View
          role="dialog"
          style={[
            styles.panel,
            { backgroundColor: theme.colors.surfaceContainer },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const BottomSheet = ({
  isPresented,
  onIsPresentedChange,
  children,
}: {
  isPresented: boolean;
  onIsPresentedChange?: (isPresented: boolean) => void;
  children?: ReactNode;
}) => (
  <Panel visible={isPresented} onDismiss={() => onIsPresentedChange?.(false)}>
    {isPresented ? children : null}
  </Panel>
);

export const NavigationStack = ({
  children,
}: ModifierProps & { children?: ReactNode }) => (
  <View style={styles.sheetContent}>{children}</View>
);

const ToolbarContent = ({ children }: { children?: ReactNode }) => (
  <View style={styles.toolbar}>{children}</View>
);

export const Toolbar = Object.assign(
  ({ children, modifiers }: ModifierProps & { children?: ReactNode }) => {
    const theme = useTheme();
    const title = modifiers?.find(m => m.$type === 'navigationTitle')
      ?.$args[0] as string | undefined;
    return (
      <View style={styles.sheetContent}>
        {title ? (
          <RNText
            style={[styles.sheetTitle, { color: theme.colors.onSurface }]}
          >
            {title}
          </RNText>
        ) : null}
        {children}
      </View>
    );
  },
  { Content: ToolbarContent },
);

export const ToolbarItem = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);

/** Marks a ConfirmationDialog's parts, which it finds by these types. */
const slot = (name: string) => {
  const Slot = ({ children }: { children?: ReactNode }) => <>{children}</>;
  Slot.displayName = name;
  return Slot;
};
const Trigger = slot('ConfirmationDialog.Trigger');
const Actions = slot('ConfirmationDialog.Actions');
const Message = slot('ConfirmationDialog.Message');

const partOf = (children: ReactNode, type: unknown) =>
  Children.toArray(children).find(
    (child): child is ReactElement<{ children?: ReactNode }> =>
      isValidElement(child) && child.type === type,
  )?.props.children;

export const ConfirmationDialog = Object.assign(
  ({
    title,
    isPresented,
    onIsPresentedChange,
    children,
  }: {
    title?: string;
    titleVisibility?: string;
    isPresented: boolean;
    onIsPresentedChange?: (isPresented: boolean) => void;
    children?: ReactNode;
  }) => {
    const theme = useTheme();
    const dismiss = () => onIsPresentedChange?.(false);
    const actions = Children.toArray(partOf(children, Actions));
    return (
      <>
        {partOf(children, Trigger)}
        <Panel visible={isPresented} onDismiss={dismiss}>
          {title ? (
            <RNText
              style={[styles.sheetTitle, { color: theme.colors.onSurface }]}
            >
              {title}
            </RNText>
          ) : null}
          {partOf(children, Message)}
          <View style={styles.dialogActions}>
            {actions.map(action =>
              isValidElement<{ onPress?: () => void }>(action) ? (
                <Pressable
                  key={action.key}
                  onPress={() => {
                    action.props.onPress?.();
                    dismiss();
                  }}
                >
                  {/* The action's own look, without its own press. */}
                  <View pointerEvents="none">{action}</View>
                </Pressable>
              ) : null,
            )}
            <Button label={t('cancel')} role="cancel" onPress={dismiss} />
          </View>
        </Panel>
      </>
    );
  },
  { Trigger, Actions, Message },
);

export const Link = ({
  children,
}: ModifierProps & { destination?: string; children?: ReactNode }) => (
  <>{children}</>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  vStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  hStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
  },
  symbol: {
    textAlign: 'center',
  },
  button: {
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  row: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
  horizontalRule: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  verticalRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  circle: {
    borderRadius: 9999,
    width: 8,
    height: 8,
  },
  progress: {
    alignItems: 'center',
    gap: 8,
  },
  track: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 4,
  },
  section: {
    gap: 6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  rows: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  formRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 4,
  },
  form: {
    padding: 20,
    alignItems: 'center',
  },
  formColumn: {
    width: '100%',
    maxWidth: 760,
  },
  field: {
    fontSize: 14,
    minHeight: 32,
    outlineWidth: 0,
  },
  picker: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  pickerOption: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 5,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 13,
  },
  selectedText: {
    fontWeight: '600',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panelHolder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  sheetContent: {
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogActions: {
    gap: 8,
    alignItems: 'flex-end',
  },
});
