import { useContext, useLayoutEffect } from 'react';
import { PlatformColor, StyleSheet } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { TextInput } from '@expo/ui';
import {
  Button,
  Circle,
  Form as SwiftUIForm,
  Host,
  HStack,
  Image,
  Label,
  LabeledContent,
  ProgressView,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  disabled,
  font,
  foregroundStyle,
  frame,
  background,
  headerProminence,
  listRowBackground,
  refreshable,
  scrollContentBackground,
  textSelection,
  toggleStyle,
} from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import { useTheme } from 'theme';
import {
  parseNumberInput,
  sectionRows,
  type FormButtonProps,
  type FormIcon,
  type FormLinkProps,
  type FormNumberFieldProps,
  type FormParagraphProps,
  type FormProfileProps,
  type FormProps,
  type FormSectionProps,
  type FormTextProps,
  type FormToggleProps,
} from './Form.shared';

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
    <Host style={styles.fill} seedColor={theme.colors.primary} testID={testID}>
      <SwiftUIForm
        modifiers={[
          ...(DeviceInfo.isMac() ? macFormModifiers : []),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}
      >
        {children}
      </SwiftUIForm>
    </Host>
  );
};

const macRowBackground = listRowBackground(
  PlatformColor('quaternarySystemFill'),
);
// System Settings on the Mac: bold section titles above the group.
const macTitledSectionModifiers = [
  headerProminence('increased'),
  macRowBackground,
];
const macSectionModifiers = [macRowBackground];

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
}) => (
  <Section
    title={title}
    footer={footer ? <Text>{footer}</Text> : undefined}
    modifiers={
      DeviceInfo.isMac()
        ? title
          ? macTitledSectionModifiers
          : macSectionModifiers
        : undefined
    }
  >
    {sectionRows(children)}
  </Section>
);

const RowLabel: React.FC<{
  title: string;
  icon?: FormIcon;
  plain?: boolean;
}> = ({ title, icon, plain }) => {
  const text = (
    <Text modifiers={plain ? [primaryText] : undefined}>{title}</Text>
  );
  // The system draws the symbol at the row's text size. (@expo/ui's Image
  // would draw it at a fixed 24 pt.)
  return icon ? <Label systemImage={icon.ios}>{text}</Label> : text;
};

const secondaryText = foregroundStyle(PlatformColor('secondaryLabel'));

const RowDetail: React.FC<{ detail?: string }> = ({ detail }) =>
  detail ? <Text modifiers={[secondaryText]}>{detail}</Text> : null;

export const FormText: React.FC<FormTextProps> = ({
  title,
  icon,
  testID,
  detail,
}) => (
  <LabeledContent
    label={<RowLabel title={title} icon={icon} plain />}
    testID={testID}
  >
    <RowDetail detail={detail} />
  </LabeledContent>
);

/** A row that opens another page, with the chevron. */
export const FormLink: React.FC<FormLinkProps> = ({
  title,
  icon,
  testID,
  detail,
  onPress,
  badge,
}) => {
  const theme = useTheme();
  return (
    <Button onPress={onPress} testID={testID}>
      <HStack>
        <RowLabel title={title} icon={icon} plain />
        <Spacer />
        <RowDetail detail={detail} />
        {badge ? (
          <Circle
            modifiers={[
              foregroundStyle(theme.colors.status.red),
              frame({ width: 10, height: 10 }),
            ]}
          />
        ) : null}
        <Image systemName="chevron.right" modifiers={chevronModifiers} />
      </HStack>
    </Button>
  );
};

/** A row that does something right away. */
export const FormButton: React.FC<FormButtonProps> = ({
  title,
  icon,
  testID,
  detail,
  onPress,
  destructive,
  loading,
  selected,
}) => {
  const choice = selected !== undefined;
  return (
    <Button
      onPress={onPress}
      role={destructive ? 'destructive' : undefined}
      testID={testID}
      modifiers={loading ? [disabled(true)] : undefined}
    >
      <HStack>
        <RowLabel
          title={title}
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
