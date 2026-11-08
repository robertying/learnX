import { PlatformColor, StyleSheet } from 'react-native';
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
  RoundedRectangle,
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
  headerProminence,
  refreshable,
} from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import { useTheme } from 'theme';
import {
  parseNumberInput,
  sectionRows,
  type FormButtonProps,
  type FormIcon,
  type FormIconColor,
  type FormLinkProps,
  type FormNumberFieldProps,
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

export const Form: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  const theme = useTheme();

  return (
    <Host style={styles.fill} seedColor={theme.colors.primary} testID={testID}>
      <SwiftUIForm modifiers={onRefresh ? [refreshable(onRefresh)] : undefined}>
        {children}
      </SwiftUIForm>
    </Host>
  );
};

// System Settings on the Mac: bold section titles above the group.
const macSectionModifiers = [headerProminence('increased')];

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
}) => (
  <Section
    title={title}
    footer={footer ? <Text>{footer}</Text> : undefined}
    modifiers={title && DeviceInfo.isMac() ? macSectionModifiers : undefined}
  >
    {sectionRows(children)}
  </Section>
);

const tileColors: Record<FormIconColor, string> = {
  blue: 'systemBlue',
  brown: 'systemBrown',
  gray: 'systemGray',
  green: 'systemGreen',
  indigo: 'systemIndigo',
  orange: 'systemOrange',
  pink: 'systemPink',
  purple: 'systemPurple',
  red: 'systemRed',
  teal: 'systemTeal',
};

/** A white symbol on a colored rounded square, as in System Settings. */
const IconTile: React.FC<{ icon: FormIcon }> = ({ icon }) => (
  <ZStack modifiers={[frame({ width: 20, height: 20 })]}>
    <RoundedRectangle
      cornerRadius={5}
      modifiers={[
        foregroundStyle(PlatformColor(tileColors[icon.color ?? 'gray'])),
      ]}
    />
    <Image
      systemName={icon.ios}
      modifiers={[font({ size: 11, weight: 'semibold' })]}
      color="white"
    />
  </ZStack>
);

const RowLabel: React.FC<{
  title: string;
  icon?: FormIcon;
  plain?: boolean;
}> = ({ title, icon, plain }) => {
  const text = (
    <Text modifiers={plain ? [primaryText] : undefined}>{title}</Text>
  );
  if (!icon) {
    return text;
  }
  // On iOS the system draws the symbol at the row's text size. (@expo/ui's
  // Image would draw it at a fixed 24 pt.)
  return DeviceInfo.isMac() ? (
    <Label icon={<IconTile icon={icon} />}>{text}</Label>
  ) : (
    <Label systemImage={icon.ios}>{text}</Label>
  );
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
              foregroundStyle(theme.colors.error),
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

export const FormToggle: React.FC<FormToggleProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
  disabled: isDisabled,
  loading,
}) => {
  const isMac = DeviceInfo.isMac();
  return loading ? (
    <LabeledContent label={<RowLabel title={title} icon={icon} plain />}>
      <ProgressView />
    </LabeledContent>
  ) : (
    <Toggle
      isOn={value}
      onIsOnChange={onValueChange}
      // The Mac labels the switch with the icon tile.
      label={isMac ? undefined : title}
      systemImage={isMac ? undefined : icon?.ios}
      testID={testID}
      modifiers={isDisabled ? [disabled(true)] : undefined}
    >
      {isMac ? <RowLabel title={title} icon={icon} plain /> : undefined}
    </Toggle>
  );
};

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
        <Image systemName="person.fill" size={avatarSize / 2} color="white" />
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
