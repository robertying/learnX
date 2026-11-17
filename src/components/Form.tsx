import {
  cloneElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  PlatformColor,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { TextInput } from '@expo/ui';
import {
  Button,
  Circle,
  ConfirmationDialog,
  Form as SwiftUIForm,
  HStack,
  Image,
  Label,
  LabeledContent,
  ProgressView,
  RNHostView,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityIdentifier,
  alignmentGuide,
  accessibilityHidden,
  accessibilityLabel,
  buttonStyle,
  accessibilityValue,
  disabled,
  font,
  foregroundStyle,
  frame,
  background,
  lineLimit,
  listRowBackground,
  listRowSeparator,
  listSectionMargins,
  listSectionSpacing,
  listRowInsets,
  lineSpacing,
  opacity,
  padding,
  refreshable,
  scrollContentBackground,
  textSelection,
  scrollDismissesKeyboard,
  scrollEdgeEffectStyle,
  strikethrough,
  textInputAutocapitalization,
  autocorrectionDisabled,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import { BADGE_COLOR, DOT_SIZE } from 'components/Badge';
import DeviceInfo from 'constants/DeviceInfo';
import Spacing from 'constants/Spacing';
import { t } from 'helpers/i18n';
import { useFieldText } from 'hooks/useFieldText';
import useNumberFieldDone, {
  NumberFieldFocusContext,
  useNumberFieldFocus,
} from 'hooks/useNumberFieldDone';
import { systemIcons } from 'helpers/systemIcons';
import { useTheme } from 'theme';
import {
  parseNumberInput,
  sectionRows,
  stackedDetail,
  type FormButtonProps,
  type FormChoiceButtonProps,
  type FormFileProps,
  type FormIcon,
  type FormItemRowProps,
  type FormLinkProps,
  type FormNumberFieldProps,
  type FormParagraphProps,
  type FormProfileProps,
  type FormProps,
  type FormSectionProps,
  type FormTextFieldProps,
  type FormTextProps,
  type FormTitleProps,
  type FormToggleProps,
  type FormViewProps,
} from './Form.shared';
import ThemedHost from 'components/ThemedHost';
import { textStyles } from 'components/Text';
import { rowHighlight } from 'components/Touchable';

export * from './Form.shared';

// Concrete system colors: inside a Button, hierarchical styles resolve to
// the tint.
const primaryText = foregroundStyle(PlatformColor('label'));
// A button reads the names of the symbols in it ("Forward", "Checkmark"):
// the chevron is decoration, and a choice says Selected with its trait.
const checkmarkModifiers = [
  font({ textStyle: 'body', weight: 'semibold' }),
  accessibilityHidden(true),
];
const chevronModifiers = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle(PlatformColor('tertiaryLabel')),
  accessibilityHidden(true),
];
const selectedModifiers = [accessibilityAddTraits(['isSelected'])];
// A row whose page is open beside the Form, in the gray of a list's
// selected row, without the separators above and below it, as UIKit leaves
// them out beside a selected cell.
const openedModifiers = [
  ...selectedModifiers,
  listRowBackground(rowHighlight ?? PlatformColor('systemGray4')),
  listRowSeparator('hidden', 'all'),
];

// Mac apps draw grouped rows in light gray on the window's white (black in
// Dark Mode), not white rows on gray as on iOS.
const macFormModifiers = [
  scrollContentBackground('hidden'),
  background(PlatformColor('systemBackground')),
  // Sections close together, as System Settings groups them: with a
  // section's title or footer, SwiftUI's own spacing is already wide.
  listSectionSpacing(12),
];

// Behind iOS's inset grouped rows
const groupedBackground = PlatformColor('systemGroupedBackground');

// The last section would otherwise end right at the floating tab bar's top
// edge when scrolled to the end (on Mac, its footer at the window's bottom
// edge); with this its rows end about a section's spacing above it (its
// footer a little less), as one more section would. (Android's list has its
// own bottom padding.)
const lastSectionModifiers = [
  listSectionMargins({ edges: 'bottom', length: Spacing.l }),
];

// The space above the first section, as iOS spaces it under an inline title.
// Left to SwiftUI, it is smaller while the header still has the large title
// of the screen pushed from (Today, the lists), and grows as the push ends:
// the rows slid down as the screen came in.
const firstSectionModifiers = [
  listSectionMargins({ edges: 'top', length: 35 }),
];

/** Marks the first and last sections for their margins. */
const sectionsMarked = (children: ReactNode) =>
  sectionRows(children).map((section, index, sections) =>
    index === 0 || index === sections.length - 1
      ? cloneElement(section as ReactElement<FormSectionProps>, {
          first: index === 0,
          last: index === sections.length - 1,
        })
      : section,
  );

export const Form: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  // Optional: a Form outside a navigator (as in tests) has no header.
  const navigation = useContext(NavigationContext);

  // Before iOS 26 the header continues the gray grouped background instead
  // of sitting on it as a white bar, with no hairline, as in the Settings
  // app. From iOS 26 the Form scrolls under the header's glass, which every
  // stack has (`stackScreenOptions`). Mac Forms are white, like the header.
  useLayoutEffect(() => {
    if (DeviceInfo.isMac() || DeviceInfo.hasLiquidGlass()) {
      return;
    }
    navigation?.setOptions({
      headerShadowVisible: false,
      headerStyle: { backgroundColor: groupedBackground },
    });
    // The default header again for a screen that shows something else after
    // its Form (file detail's preview).
    return () =>
      navigation?.setOptions({
        headerShadowVisible: undefined,
        headerStyle: undefined,
      });
  }, [navigation]);

  const reportNumberFocus = useNumberFieldDone();

  return (
    <ThemedHost style={styles.fill} testID={testID}>
      <NumberFieldFocusContext
        value={DeviceInfo.isMac() ? null : reportNumberFocus}
      >
        <SwiftUIForm
          modifiers={[
            // Dragging the form down pulls the keyboard away, as in Notes.
            scrollDismissesKeyboard('interactively'),
            ...(DeviceInfo.isMac() ? macFormModifiers : glassHeaderModifiers),
            ...(onRefresh ? [refreshable(onRefresh)] : []),
          ]}
        >
          {sectionsMarked(children)}
        </SwiftUIForm>
      </NumberFieldFocusContext>
    </ThemedHost>
  );
};

/**
 * The root view of a screen that is a Form, in place of `SafeArea`. A SwiftUI
 * Form keeps its rows inside the safe area itself and draws its grouped
 * background out to the screen's edges, as Settings does in landscape; inside
 * `SafeArea` that background would stop at the safe area instead.
 *
 * Not collapsable: a view with only a background color doesn't form a
 * stacking context, so React Native would mount the Form beside it instead of
 * inside. UIKit looks for the scroll view that collapses a large title and
 * tints the header down the screen's first subviews, and would stop at this
 * empty view: Today's large title stayed over the list as it scrolled.
 */
export const FormScreen: React.FC<ViewProps> = ({ style, ...props }) => (
  <View
    collapsable={false}
    style={[styles.fill, styles.screen, style]}
    {...props}
  />
);

// The header's glass over what scrolls under it, as for the app's other
// scroll views (`ScrollEdgeEffect.swift`, which SwiftUI's own style overrides):
// in an iPad split view's other columns the automatic style is an opaque band.
const glassHeaderModifiers = [scrollEdgeEffectStyle('soft', 'top')];

const macRowBackground = listRowBackground(
  PlatformColor('quaternarySystemFill'),
);
// Clear of the toolbar, as System Settings starts its first group.
const macFirstSectionModifiers = [
  listSectionMargins({ edges: 'top', length: 20 }),
];
// System Settings sets a row's symbol and text close to the group's edges.
const macRowInset = 12;
const macSectionModifiers = [
  macRowBackground,
  listRowInsets({
    top: 10,
    leading: macRowInset,
    bottom: 10,
    trailing: macRowInset,
  }),
];
// System Settings on the Mac: bold titles in the label color above the
// group. (Catalyst ignores headerProminence, so the title is our own Text.)
const macHeaderModifiers = [
  font({ textStyle: 'headline', weight: 'bold' }),
  primaryText,
];

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
  footerHidden,
  first,
  last,
}) => {
  const isMac = DeviceInfo.isMac();
  return (
    <Section
      title={isMac ? undefined : title}
      header={
        isMac && title ? (
          <Text modifiers={macHeaderModifiers}>{title}</Text>
        ) : undefined
      }
      footer={
        footer ? (
          <Text
            modifiers={
              isMac || footerHidden
                ? [
                    ...(isMac ? macFooterModifiers : []),
                    ...(footerHidden ? hiddenFooterModifiers : []),
                  ]
                : undefined
            }
          >
            {footer}
          </Text>
        ) : undefined
      }
      modifiers={
        isMac
          ? [
              ...macSectionModifiers,
              ...(first ? macFirstSectionModifiers : []),
              ...(last ? lastSectionModifiers : []),
            ]
          : [
              ...(first ? firstSectionModifiers : []),
              ...(last ? lastSectionModifiers : []),
            ]
      }
    >
      {sectionRows(children)}
    </Section>
  );
};

// The Mac's footnote is set tight, which crowds Chinese lines.
const macFooterModifiers = [font({ textStyle: 'footnote' }), lineSpacing(3)];

// A footer that keeps its place while hidden (`footerHidden`)
const hiddenFooterModifiers = [opacity(0), accessibilityHidden(true)];

const secondaryText = foregroundStyle(PlatformColor('secondaryLabel'));
const subtitleModifiers = [font({ textStyle: 'subheadline' }), secondaryText];
const struckText = [
  secondaryText,
  strikethrough({ isActive: true, pattern: 'solid' }),
];

const unavailableModifiers = [foregroundStyle(PlatformColor('tertiaryLabel'))];

const overlineModifiers = [font({ textStyle: 'caption', weight: 'semibold' })];

const RowLabel: React.FC<{
  title: string;
  subtitle?: string;
  overline?: string;
  icon?: FormIcon;
  plain?: boolean;
  struck?: boolean;
  /** An item's title, in medium weight. */
  item?: boolean;
  /** Read out as over, which the row only shows by being dimmed. */
  done?: boolean;
  /**
   * Grayed out, as a disabled button's label. Set explicitly: `disabled` only
   * grays a label drawn in the tint, not the label color plain rows use.
   */
  unavailable?: boolean;
}> = ({
  title,
  subtitle,
  overline,
  icon,
  plain,
  struck,
  item,
  done,
  unavailable,
}) => {
  const theme = useTheme();
  const modifiers = unavailable
    ? unavailableModifiers
    : struck
      ? // the strikethrough isn't read out
        [...struckText, accessibilityValue(t('a11yStruck'))]
      : plain
        ? done
          ? [primaryText, accessibilityValue(t('a11yDone'))]
          : [primaryText]
        : undefined;
  const text = (
    <Text
      modifiers={
        item
          ? [
              font({ textStyle: 'body', weight: 'medium' }),
              ...(modifiers ?? []),
            ]
          : modifiers
      }
    >
      {title}
    </Text>
  );
  const label =
    subtitle || overline ? (
      <VStack alignment="leading" spacing={2}>
        {overline ? (
          <Text
            modifiers={[
              ...overlineModifiers,
              foregroundStyle(theme.colors.primary),
            ]}
          >
            {overline}
          </Text>
        ) : null}
        {text}
        {subtitle ? (
          <Text modifiers={subtitleModifiers}>{subtitle}</Text>
        ) : null}
      </VStack>
    ) : (
      text
    );
  // The system draws the symbol at the row's text size. (@expo/ui's Image
  // would draw it at a fixed 24 pt.)
  if (!icon) {
    return label;
  }
  // The Mac's label sets the symbol right against the text, at the Mac's
  // own text size: there the symbol gets a column of its own, at the rows'
  // text size, as in System Settings.
  return DeviceInfo.isMac() ? (
    <HStack spacing={macIconSpacing} modifiers={macIconRowModifiers}>
      <Image
        systemName={systemIcons[icon].ios}
        size={textStyles.body.fontSize}
        // In the tint beside text in the label color, as a label's symbol
        // is, and otherwise as the text (red in a destructive button).
        color={
          unavailable
            ? PlatformColor('tertiaryLabel')
            : plain
              ? theme.colors.primary
              : undefined
        }
        modifiers={macIconModifiers}
      />
      {label}
    </HStack>
  ) : (
    <Label
      systemImage={systemIcons[icon].ios}
      modifiers={unavailable ? unavailableModifiers : undefined}
    >
      {label}
    </Label>
  );
};

const macIconWidth = 20;
const macIconSpacing = 14;
const macIconModifiers = [frame({ width: macIconWidth })];
// The separator under the row starts where its text does, past the symbol.
const macIconRowModifiers = [
  alignmentGuide('listRowSeparatorLeading', macIconWidth + macIconSpacing),
];
// Every row is as wide as the row, with its separator ending at the row's
// end, past the chevron or switch, as in System Settings. (SwiftUI on the
// Mac ends it short of what's at the end of the row.)
const rowEnd = DeviceInfo.isMac()
  ? [
      frame({ maxWidth: 100_000, alignment: 'leading' }),
      alignmentGuide('listRowSeparatorTrailing', 0, { fromTrailing: true }),
    ]
  : [];

/** The row's subtitle and detail for the text size (`stackedDetail`). */
const useStackedDetail = (subtitle?: string, detail?: string) =>
  stackedDetail({ subtitle, detail }, useWindowDimensions().fontScale);

const RowDetail: React.FC<{
  detail?: string;
  tint?: FormItemRowProps['detailTint'];
}> = ({ detail, tint }) => {
  const theme = useTheme();
  if (!detail) {
    return null;
  }
  const modifiers =
    tint === 'accent'
      ? [
          font({ textStyle: 'title3', weight: 'bold' }),
          foregroundStyle(theme.colors.primary),
        ]
      : tint
        ? [
            font({ textStyle: 'body', weight: 'semibold' }),
            // The text shade of the hue, readable on the row
            foregroundStyle(theme.colors.onStatusContainer[tint]),
          ]
        : [secondaryText];
  return <Text modifiers={modifiers}>{detail}</Text>;
};

const doneModifiers = [opacity(0.5)];

/**
 * The inside of a text or link row: the label, the detail, `trailing`, and a
 * progress bar under it all. A row that's done is dimmed.
 */
const ItemRow: React.FC<
  FormItemRowProps & {
    trailing?: React.ReactNode;
    badge?: React.ReactNode;
  }
> = ({
  title,
  overline,
  icon,
  item,
  done,
  progress,
  detailTint,
  badge,
  trailing,
  ...rest
}) => {
  const { subtitle, detail } = useStackedDetail(rest.subtitle, rest.detail);
  const row = (
    <HStack
      modifiers={[
        ...(done ? doneModifiers : []),
        ...(progress === undefined ? rowEnd : []),
      ]}
    >
      <RowLabel
        title={title}
        subtitle={subtitle}
        overline={overline}
        icon={icon}
        plain
        item={item}
        done={done}
      />
      <Spacer />
      <RowDetail detail={detail} tint={done ? undefined : detailTint} />
      {badge}
      {trailing}
    </HStack>
  );
  return progress === undefined ? (
    row
  ) : (
    <VStack alignment="leading" spacing={8} modifiers={rowEnd}>
      {row}
      <ProgressView value={progress} />
    </VStack>
  );
};

// Borderless, so that only the button takes taps and not the whole row.
const actionModifiers = [buttonStyle('borderless')];

export const FormText: React.FC<FormTextProps> = ({
  testID,
  detailTint,
  action,
  ...row
}) => {
  const { subtitle, detail } = useStackedDetail(row.subtitle, row.detail);
  return row.done || row.progress !== undefined || action ? (
    // SwiftUI gives a stack's identifier to every element in it, the
    // action's own included; as a container element the row keeps it alone.
    <VStack
      modifiers={[
        ...rowEnd,
        ...(testID
          ? [accessibilityElement('contain'), accessibilityIdentifier(testID)]
          : []),
      ]}
    >
      <ItemRow
        {...row}
        detailTint={detailTint}
        trailing={
          action ? (
            <Button
              label={action.title}
              onPress={action.onPress}
              testID={action.testID}
              modifiers={actionModifiers}
            />
          ) : undefined
        }
      />
    </VStack>
  ) : (
    <LabeledContent
      label={
        <RowLabel
          title={row.title}
          subtitle={subtitle}
          overline={row.overline}
          icon={row.icon}
          plain
          item={row.item}
        />
      }
      testID={testID}
      modifiers={rowEnd}
    >
      <RowDetail detail={detail} tint={detailTint} />
    </LabeledContent>
  );
};

/** A row that opens another page, with the chevron. */
export const FormLink: React.FC<FormLinkProps> = ({
  testID,
  onPress,
  badge,
  opened,
  ...row
}) => {
  return (
    <Button
      onPress={onPress}
      testID={testID}
      modifiers={opened ? openedModifiers : undefined}
    >
      <ItemRow
        {...row}
        badge={
          badge ? (
            <Circle
              modifiers={[
                foregroundStyle(BADGE_COLOR),
                frame({ width: DOT_SIZE, height: DOT_SIZE }),
                accessibilityLabel(t('a11yNewBadge')),
              ]}
            />
          ) : null
        }
        trailing={
          <Image systemName="chevron.right" modifiers={chevronModifiers} />
        }
      />
    </Button>
  );
};

/** A row that does something right away. */
export const FormButton: React.FC<FormButtonProps> = ({
  title,
  subtitle,
  icon,
  testID,
  detail,
  onPress,
  destructive,
  loading,
  disabled: isDisabled,
  selected,
}) => {
  const choice = selected !== undefined;
  return (
    <Button
      onPress={onPress}
      role={destructive ? 'destructive' : undefined}
      testID={testID}
      modifiers={[
        ...(loading || isDisabled ? [disabled(true)] : []),
        ...(selected ? selectedModifiers : []),
      ]}
    >
      <HStack modifiers={rowEnd}>
        <RowLabel
          title={title}
          subtitle={subtitle}
          icon={icon}
          // Action rows are drawn in the tint, which says they can be
          // clicked (on Mac too, where a row has no other sign of it);
          // choices use the label color, and destructive rows stay red.
          plain={choice && !destructive}
          unavailable={isDisabled}
        />
        <Spacer />
        <RowDetail detail={detail} />
        {loading ? <ProgressView /> : null}
        {selected ? (
          <Image systemName="checkmark" modifiers={checkmarkModifiers} />
        ) : null}
      </HStack>
    </Button>
  );
};

export const FormChoiceButton: React.FC<FormChoiceButtonProps> = ({
  sheet: { title, message, choices, onCancel },
  ...row
}) => {
  const [presented, setPresented] = useState(false);
  // SwiftUI reports the dismissal after the choice's action has run.
  const chose = useRef(false);

  const handlePresentedChange = (value: boolean) => {
    setPresented(value);
    if (value) {
      chose.current = false;
    } else if (!chose.current) {
      onCancel?.();
    }
  };

  return (
    <ConfirmationDialog
      title={title}
      titleVisibility="visible"
      isPresented={presented}
      onIsPresentedChange={handlePresentedChange}
    >
      <ConfirmationDialog.Trigger>
        <FormButton {...row} onPress={() => handlePresentedChange(true)} />
      </ConfirmationDialog.Trigger>
      <ConfirmationDialog.Actions>
        {choices.map(choice => (
          <Button
            key={choice.label}
            label={choice.label}
            role={choice.destructive ? 'destructive' : undefined}
            onPress={() => {
              chose.current = true;
              choice.onPress();
            }}
          />
        ))}
      </ConfirmationDialog.Actions>
      {message ? (
        <ConfirmationDialog.Message>
          <Text>{message}</Text>
        </ConfirmationDialog.Message>
      ) : null}
    </ConfirmationDialog>
  );
};

/** A file that opens on tap, with the chevron of a link. */
export const FormFile: React.FC<FormFileProps> = ({
  title,
  subtitle,
  icon,
  testID,
  detail,
  onPress,
  struck,
  disabled: isDisabled,
}) => (
  <Button
    onPress={onPress}
    testID={testID}
    modifiers={isDisabled ? [disabled(true)] : undefined}
  >
    <HStack modifiers={rowEnd}>
      <RowLabel
        title={title}
        subtitle={subtitle}
        icon={icon}
        plain
        struck={struck}
      />
      <Spacer />
      <RowDetail detail={detail} />
      <Image systemName="chevron.right" modifiers={chevronModifiers} />
    </HStack>
  </Button>
);

// Starts a few lines tall, as a box to write in, and grows with the text.
// Mac rows are tight, so the box gets the room above and below its text
// that the row's side inset gives it.
// Six lines to start with, then the field grows with its text and the Form
// scrolls, rather than the field scrolling inside the Form.
const multilineModifiers = [lineLimit({ min: 6, max: 10000 })];
const macMultilineModifiers = [...multilineModifiers, padding({ vertical: 6 })];
const plainTextModifiers = [
  textInputAutocapitalization('never'),
  autocorrectionDisabled(true),
];

/** Text the user writes, the whole width of the row. */
export const FormTextField: React.FC<FormTextFieldProps> = props => {
  const {
    placeholder,
    label,
    multiline,
    plain,
    disabled: isDisabled,
    testID,
  } = props;
  const text = useNativeState(props.value);
  useFieldText(text, props);

  return (
    <TextField
      text={text}
      placeholder={placeholder}
      axis={multiline ? 'vertical' : 'horizontal'}
      testID={testID}
      modifiers={[
        ...(multiline
          ? DeviceInfo.isMac()
            ? macMultilineModifiers
            : multilineModifiers
          : []),
        ...(plain ? plainTextModifiers : []),
        ...(isDisabled ? [disabled(true)] : []),
        ...(label ? [accessibilityLabel(label)] : []),
        ...rowEnd,
      ]}
    />
  );
};

// A switch at the end of the row, as in System Settings. (The Mac's default
// toggle is a checkbox before the label.)
const switchStyle = toggleStyle('switch');

export const FormToggle: React.FC<FormToggleProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
  disabled: isDisabled,
  loading,
}) =>
  loading ? (
    <LabeledContent
      label={<RowLabel title={title} icon={icon} plain />}
      modifiers={rowEnd}
    >
      <ProgressView />
    </LabeledContent>
  ) : (
    <Toggle
      isOn={value}
      onIsOnChange={onValueChange}
      // The Mac's own label crowds its symbol (`RowLabel`).
      label={DeviceInfo.isMac() ? undefined : title}
      systemImage={
        icon && !DeviceInfo.isMac() ? systemIcons[icon].ios : undefined
      }
      testID={testID}
      modifiers={[
        switchStyle,
        ...(isDisabled ? [disabled(true)] : []),
        ...rowEnd,
      ]}
    >
      {DeviceInfo.isMac() ? <RowLabel title={title} icon={icon} plain /> : null}
    </Toggle>
  );

/** A number typed in at the end of the row. */
export const FormNumberField: React.FC<FormNumberFieldProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
}) => {
  const reportFocus = useNumberFieldFocus();
  return (
    <LabeledContent
      label={<RowLabel title={title} icon={icon} plain />}
      modifiers={rowEnd}
    >
      <TextInput
        defaultValue={String(value)}
        onChangeText={parseNumberInput(onValueChange)}
        keyboardType="number-pad"
        textAlign="right"
        onFocus={() => reportFocus?.(() => Keyboard.dismiss())}
        onBlur={() => reportFocus?.(null)}
        // Narrow, so the label keeps the rest of the row.
        style={styles.numberField}
        accessibilityLabel={title}
        testID={testID}
      />
    </LabeledContent>
  );
};

const paragraphModifiers = [primaryText, textSelection(true)];
const headlineModifiers = [
  font({ textStyle: 'headline' }),
  ...paragraphModifiers,
];

/** Text over several lines, filling the row. */
export const FormParagraph: React.FC<FormParagraphProps> = ({
  text,
  headline,
  testID,
}) => (
  <Text
    modifiers={[
      ...(headline ? headlineModifiers : paragraphModifiers),
      ...rowEnd,
    ]}
    testID={testID}
  >
    {text}
  </Text>
);

const titleModifiers = [
  font({ textStyle: 'title2', weight: 'bold' }),
  ...paragraphModifiers,
  // A heading, as a section's header is, so the rotor jumps to it.
  accessibilityAddTraits(['isHeader']),
];

/** The title of a detail page, as in Calendar's event details. */
export const FormTitle: React.FC<FormTitleProps> = ({
  title,
  subtitle,
  testID,
}) => (
  <VStack alignment="leading" spacing={4} testID={testID} modifiers={rowEnd}>
    <Text modifiers={titleModifiers}>{title}</Text>
    {subtitle ? <Text modifiers={subtitleModifiers}>{subtitle}</Text> : null}
  </VStack>
);

// A row's height, so the row doesn't jump when the view shows up.
const loadingModifiers = [frame({ maxWidth: Infinity, minHeight: 44 })];

/**
 * A React Native view in the row, as wide as the row and as tall as itself.
 * The view stays mounted under the spinner while it loads.
 */
export const FormView: React.FC<FormViewProps> = ({ children, loading }) => (
  <VStack spacing={0} modifiers={rowEnd}>
    {loading ? <ProgressView modifiers={loadingModifiers} /> : null}
    <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
  </VStack>
);

/** The account at the top of Settings, as in the Settings app. */
export const FormProfile: React.FC<FormProfileProps> = ({ name, detail }) => {
  const theme = useTheme();
  // Smaller on the Mac, as the account row in System Settings.
  const isMac = DeviceInfo.isMac();
  const avatarSize = isMac ? 40 : 56;
  // Title 2: 22 pt on iOS, 17 pt on the Mac, a step above its 13 pt rows.
  const nameFont = font({ textStyle: 'title2', weight: 'semibold' });
  return (
    <HStack spacing={12} modifiers={rowEnd}>
      <ZStack modifiers={[frame({ width: avatarSize, height: avatarSize })]}>
        <Circle modifiers={[foregroundStyle(theme.colors.primary)]} />
        <Image
          systemName={systemIcons.account.ios}
          size={avatarSize / 2}
          color={theme.colors.onPrimary}
        />
      </ZStack>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[nameFont]}>{name}</Text>
        {detail ? (
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // The Form's own background, also behind a title above it (Setup).
  screen: {
    backgroundColor: DeviceInfo.isMac()
      ? PlatformColor('systemBackground')
      : groupedBackground,
  },
  numberField: {
    width: 72,
  },
});
