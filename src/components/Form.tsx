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
  refreshable,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';
import {
  parseNumberInput,
  sectionRows,
  type FormButtonProps,
  type FormIcon,
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

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
}) => (
  <Section title={title} footer={footer ? <Text>{footer}</Text> : undefined}>
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
  return icon ? (
    <Label icon={<Image systemName={icon.ios} />}>{text}</Label>
  ) : (
    text
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
        <RowLabel title={title} icon={icon} plain={choice} />
        <Spacer />
        <RowDetail detail={detail} />
        {loading ? <ProgressView /> : null}
        {selected ? <Image systemName="checkmark" /> : null}
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
      modifiers={isDisabled ? [disabled(true)] : undefined}
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

/** The account at the top of Settings, as in the Settings app. */
export const FormProfile: React.FC<FormProfileProps> = ({ name, detail }) => {
  const theme = useTheme();
  return (
    <HStack spacing={12}>
      <ZStack modifiers={[frame({ width: 56, height: 56 })]}>
        <Circle modifiers={[foregroundStyle(theme.colors.primary)]} />
        <Image systemName="person.fill" size={28} color="white" />
      </ZStack>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ textStyle: 'title2', weight: 'semibold' })]}>
          {name}
        </Text>
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
