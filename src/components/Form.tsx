import { useContext, useLayoutEffect } from 'react';
import { PlatformColor, StyleSheet, useWindowDimensions } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { TextInput } from '@expo/ui';
import {
  Button,
  Circle,
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
  accessibilityLabel,
  accessibilityValue,
  disabled,
  font,
  foregroundStyle,
  frame,
  background,
  lineLimit,
  listRowBackground,
  opacity,
  padding,
  refreshable,
  scrollContentBackground,
  textSelection,
  scrollDismissesKeyboard,
  strikethrough,
  textInputAutocapitalization,
  autocorrectionDisabled,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import {
  parseNumberInput,
  sectionRows,
  useFieldText,
  type FormButtonProps,
  type FormFileProps,
  type FormIcon,
  type FormItemRowProps,
  type FormLinkProps,
  type FormNumberFieldProps,
  type FormParagraphProps,
  type FormProfileProps,
  type FormProgressProps,
  type FormProps,
  type FormSectionProps,
  type FormTextFieldProps,
  type FormTextProps,
  type FormTitleProps,
  type FormToggleProps,
  type FormViewProps,
} from './Form.shared';
import ThemedHost from 'components/ThemedHost';

export * from './Form.shared';

// Concrete system colors: inside a Button, hierarchical styles resolve to
// the tint.
const primaryText = foregroundStyle(PlatformColor('label'));
const checkmarkModifiers = [font({ textStyle: 'body', weight: 'semibold' })];
const chevronModifiers = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle(PlatformColor('tertiaryLabel')),
];

// Mac apps draw grouped rows in light gray on the window's white (black in
// Dark Mode), not white rows on gray as on iOS.
const macFormModifiers = [
  scrollContentBackground('hidden'),
  background(PlatformColor('systemBackground')),
];

// systemGroupedBackground, behind iOS's inset grouped rows
const groupedBackground = { light: 'rgb(242, 242, 247)', dark: 'rgb(0, 0, 0)' };

export const Form: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  const theme = useTheme();
  // Optional: a Form outside a navigator (as in tests) has no header.
  const navigation = useContext(NavigationContext);

  // The header continues the gray grouped background on iOS instead of
  // sitting on it as a white bar. Mac Forms are white, like the header.
  useLayoutEffect(() => {
    if (DeviceInfo.isMac()) {
      return;
    }
    navigation?.setOptions({
      // As in the Settings app, no hairline between the header and the Form.
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.dark
          ? groupedBackground.dark
          : groupedBackground.light,
      },
    });
    // The default header again for a screen that shows something else after
    // its Form (file detail's preview).
    return () =>
      navigation?.setOptions({
        headerShadowVisible: undefined,
        headerStyle: undefined,
      });
  }, [navigation, theme.dark]);

  return (
    <ThemedHost style={styles.fill} testID={testID}>
      <SwiftUIForm
        modifiers={[
          // Dragging the form down pulls the keyboard away, as in Notes.
          scrollDismissesKeyboard('interactively'),
          ...(DeviceInfo.isMac() ? macFormModifiers : []),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}
      >
        {children}
      </SwiftUIForm>
    </ThemedHost>
  );
};

const macRowBackground = listRowBackground(
  PlatformColor('quaternarySystemFill'),
);
const macSectionModifiers = [macRowBackground];
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
      footer={footer ? <Text>{footer}</Text> : undefined}
      modifiers={isMac ? macSectionModifiers : undefined}
    >
      {sectionRows(children)}
    </Section>
  );
};

const secondaryText = foregroundStyle(PlatformColor('secondaryLabel'));
const subtitleModifiers = [font({ textStyle: 'subheadline' }), secondaryText];
// Mac Form rows hug their text; two-line rows get the breathing room they
// have in Mail and System Settings, and that iOS rows get from their height.
const macTwoLineModifiers = [padding({ vertical: 4 })];
const struckText = [
  secondaryText,
  strikethrough({ isActive: true, pattern: 'solid' }),
];

const RowLabel: React.FC<{
  title: string;
  subtitle?: string;
  icon?: FormIcon;
  plain?: boolean;
  struck?: boolean;
}> = ({ title, subtitle, icon, plain, struck }) => {
  const text = (
    <Text
      modifiers={
        struck
          ? // the strikethrough isn't read out
            [...struckText, accessibilityValue(t('a11yStruck'))]
          : plain
            ? [primaryText]
            : undefined
      }
    >
      {title}
    </Text>
  );
  const label = subtitle ? (
    <VStack
      alignment="leading"
      spacing={2}
      modifiers={DeviceInfo.isMac() ? macTwoLineModifiers : undefined}
    >
      {text}
      <Text modifiers={subtitleModifiers}>{subtitle}</Text>
    </VStack>
  ) : (
    text
  );
  // The system draws the symbol at the row's text size. (@expo/ui's Image
  // would draw it at a fixed 24 pt.)
  return icon ? <Label systemImage={icon.ios}>{label}</Label> : label;
};

/**
 * At accessibility text sizes the detail goes under the subtitle instead of
 * at the end of the row, which would squeeze the title into a narrow column.
 */
const useStackedDetail = (subtitle?: string, detail?: string) => {
  const { fontScale } = useWindowDimensions();
  return detail && fontScale >= 1.5
    ? {
        subtitle: [subtitle, detail].filter(Boolean).join('\n'),
        detail: undefined,
      }
    : { subtitle, detail };
};

const RowDetail: React.FC<{
  detail?: string;
  tint?: FormTextProps['detailTint'];
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
      : tint === 'warning'
        ? [
            font({ textStyle: 'body', weight: 'semibold' }),
            foregroundStyle(theme.colors.status.orange),
          ]
        : [secondaryText];
  return <Text modifiers={modifiers}>{detail}</Text>;
};

const doneModifiers = [opacity(0.5)];
const doneCheckModifiers = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  secondaryText,
];

/**
 * The inside of a text or link row: the label, the detail, a checkmark when
 * it's done, `trailing`, and a progress bar under it all.
 */
const ItemRow: React.FC<
  FormItemRowProps & {
    trailing?: React.ReactNode;
    badge?: React.ReactNode;
  }
> = ({ title, icon, done, progress, badge, trailing, ...rest }) => {
  const { subtitle, detail } = useStackedDetail(rest.subtitle, rest.detail);
  const row = (
    <HStack modifiers={done ? doneModifiers : undefined}>
      <RowLabel title={title} subtitle={subtitle} icon={icon} plain />
      <Spacer />
      <RowDetail detail={detail} />
      {badge}
      {done ? (
        <Image
          systemName="checkmark"
          modifiers={[...doneCheckModifiers, accessibilityLabel(t('a11yDone'))]}
        />
      ) : null}
      {trailing}
    </HStack>
  );
  return progress === undefined ? (
    row
  ) : (
    <VStack alignment="leading" spacing={8}>
      {row}
      <ProgressView value={progress} />
    </VStack>
  );
};

export const FormText: React.FC<FormTextProps> = ({
  testID,
  detailTint,
  ...row
}) => {
  const { subtitle, detail } = useStackedDetail(row.subtitle, row.detail);
  return row.done || row.progress !== undefined ? (
    <VStack testID={testID}>
      <ItemRow {...row} />
    </VStack>
  ) : (
    <LabeledContent
      label={
        <RowLabel title={row.title} subtitle={subtitle} icon={row.icon} plain />
      }
      testID={testID}
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
  ...row
}) => {
  const theme = useTheme();
  return (
    <Button onPress={onPress} testID={testID}>
      <ItemRow
        {...row}
        badge={
          badge ? (
            <Circle
              modifiers={[
                foregroundStyle(theme.colors.status.red),
                frame({ width: 10, height: 10 }),
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
      modifiers={loading || isDisabled ? [disabled(true)] : undefined}
    >
      <HStack>
        <RowLabel
          title={title}
          subtitle={subtitle}
          icon={icon}
          // Mac forms don't tint action rows; only choices and the Mac use
          // the label color, and destructive rows stay red.
          plain={(choice || DeviceInfo.isMac()) && !destructive}
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
    <HStack>
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
const multilineModifiers = [lineLimit({ min: 6, max: 20 })];
const macMultilineModifiers = [...multilineModifiers, padding({ vertical: 6 })];
const plainTextModifiers = [
  textInputAutocapitalization('never'),
  autocorrectionDisabled(true),
];

/** Text the user writes, the whole width of the row. */
export const FormTextField: React.FC<FormTextFieldProps> = props => {
  const { placeholder, multiline, plain, disabled: isDisabled, testID } = props;
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
      ]}
    />
  );
};

/** A bar under its title, as for a download in progress. */
export const FormProgress: React.FC<FormProgressProps> = ({
  title,
  value,
  testID,
}) => (
  <ProgressView value={value} testID={testID}>
    <Text>{title}</Text>
  </ProgressView>
);

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
    <LabeledContent label={<RowLabel title={title} icon={icon} plain />}>
      <ProgressView />
    </LabeledContent>
  ) : (
    <Toggle
      isOn={value}
      onIsOnChange={onValueChange}
      label={title}
      systemImage={icon?.ios}
      testID={testID}
      modifiers={isDisabled ? [switchStyle, disabled(true)] : [switchStyle]}
    />
  );

/** A number typed in at the end of the row. */
export const FormNumberField: React.FC<FormNumberFieldProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
}) => (
  <LabeledContent label={<RowLabel title={title} icon={icon} plain />}>
    <TextInput
      defaultValue={String(value)}
      onChangeText={parseNumberInput(onValueChange)}
      keyboardType="number-pad"
      textAlign="right"
      // Narrow, so the label keeps the rest of the row.
      style={styles.numberField}
      accessibilityLabel={title}
      testID={testID}
    />
  </LabeledContent>
);

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
    modifiers={headline ? headlineModifiers : paragraphModifiers}
    testID={testID}
  >
    {text}
  </Text>
);

const titleModifiers = [
  font({ textStyle: 'title2', weight: 'bold' }),
  ...paragraphModifiers,
];

/** The title of a detail page, as in Calendar's event details. */
export const FormTitle: React.FC<FormTitleProps> = ({
  title,
  subtitle,
  testID,
}) => (
  <VStack alignment="leading" spacing={4} testID={testID}>
    <Text modifiers={titleModifiers}>{title}</Text>
    {subtitle ? <Text modifiers={subtitleModifiers}>{subtitle}</Text> : null}
  </VStack>
);

/** A React Native view in the row, as wide as the row and as tall as itself. */
export const FormView: React.FC<FormViewProps> = ({ children }) => (
  <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
);

/** The account at the top of Settings, as in the Settings app. */
export const FormProfile: React.FC<FormProfileProps> = ({ name, detail }) => {
  const theme = useTheme();
  // Smaller on the Mac, as the account row in System Settings.
  const isMac = DeviceInfo.isMac();
  const avatarSize = isMac ? 40 : 56;
  const nameFont = font({
    textStyle: isMac ? 'headline' : 'title2',
    weight: 'semibold',
  });
  return (
    <HStack spacing={12}>
      <ZStack modifiers={[frame({ width: avatarSize, height: avatarSize })]}>
        <Circle modifiers={[foregroundStyle(theme.colors.primary)]} />
        <Image
          systemName="person.fill"
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
  numberField: {
    width: 72,
  },
});
