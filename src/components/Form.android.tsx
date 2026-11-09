import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  Badge,
  CircularProgressIndicator,
  Column,
  LazyColumn,
  LinearProgressIndicator,
  ListItem,
  OutlinedTextField,
  PullToRefreshBox,
  RadioButton,
  RNHostView,
  Row,
  Switch,
  Text,
  TextField,
  useMaterialColors,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  background,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  padding,
  selectable,
  Shapes,
  size,
  testID as testIDModifier,
  toggleable,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from 'theme';
import { t } from 'helpers/i18n';
import {
  parseNumberInput,
  positionRows,
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
  type FormRowPosition,
  type FormSectionProps,
  type FormTextFieldProps,
  type FormTextProps,
  type FormTitleProps,
  type FormToggleProps,
  type FormViewProps,
} from './Form.shared';
import ThemedHost from 'components/ThemedHost';

export * from './Form.shared';

// The Material 3 grouped list (as in Android's Settings): sections of rows on
// surfaceContainer, fully rounded at the section's ends and slightly rounded
// between rows, 2 dp apart. The same layout as @expo/ui's FieldGroup.

const FULL = 20;
const SMALL = 4;
const radii: Record<FormRowPosition, number[]> = {
  only: [FULL, FULL, FULL, FULL],
  first: [FULL, FULL, SMALL, SMALL],
  middle: [SMALL, SMALL, SMALL, SMALL],
  last: [SMALL, SMALL, FULL, FULL],
};
const rowShape = (position: FormRowPosition = 'only') => {
  const [topStart, topEnd, bottomStart, bottomEnd] = radii[position];
  return clip(
    Shapes.RoundedCorner({ topStart, topEnd, bottomStart, bottomEnd }),
  );
};

const withTestID = (testID?: string) =>
  testID ? [testIDModifier(testID)] : [];

/** A row of a section: a list item in the section's color and corners. */
const SectionItem: React.FC<{
  position?: FormRowPosition;
  testID?: string;
  children: ReactNode;
}> = ({ position, testID, children }) => {
  const colors = useMaterialColors();
  return (
    <ListItem
      colors={{ containerColor: colors.surfaceContainer }}
      modifiers={[fillMaxWidth(), rowShape(position), ...withTestID(testID)]}
    >
      {children}
    </ListItem>
  );
};

const FormContent: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  const colors = useMaterialColors();
  const [refreshing, setRefreshing] = useState(false);

  const list = (
    <LazyColumn
      verticalArrangement={{ spacedBy: 24 }}
      contentPadding={{ start: 16, end: 16, top: 16, bottom: 16 }}
      modifiers={[
        fillMaxSize(),
        // Shrinks the list above the keyboard, so a focused number field
        // scrolls into view.
        imePadding(),
        ...withTestID(testID),
      ]}
    >
      {children}
    </LazyColumn>
  );

  if (!onRefresh) {
    return list;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PullToRefreshBox
      // The indicator takes the box's alignment: @expo/ui replaces Compose's
      // default modifier (align(TopCenter)), so without this it sits at the
      // start edge. The list fills the box either way.
      contentAlignment="topCenter"
      isRefreshing={refreshing}
      onRefresh={handleRefresh}
      indicator={{ color: colors.primary }}
      modifiers={[fillMaxSize()]}
    >
      {list}
    </PullToRefreshBox>
  );
};

export const Form: React.FC<FormProps> = props => {
  const theme = useTheme();
  return (
    <ThemedHost
      style={[styles.fill, { backgroundColor: theme.colors.surface }]}
    >
      <FormContent {...props} />
    </ThemedHost>
  );
};

const Caption: React.FC<{ children: string; modifiers: ModifierConfig[] }> = ({
  children,
  modifiers,
}) => {
  const colors = useMaterialColors();
  return (
    <Text
      color={colors.onSurfaceVariant}
      style={{ typography: 'bodyMedium' }}
      modifiers={modifiers}
    >
      {children}
    </Text>
  );
};

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
}) => {
  const colors = useMaterialColors();
  const rows = positionRows(children);
  return (
    <Column verticalArrangement={{ spacedBy: 4 }} modifiers={[fillMaxWidth()]}>
      {title ? (
        <Text
          color={colors.primary}
          style={{ typography: 'titleSmall' }}
          modifiers={[padding(16, 0, 16, 8)]}
        >
          {title}
        </Text>
      ) : null}
      {rows.length > 0 ? (
        <Column
          verticalArrangement={{ spacedBy: 2 }}
          modifiers={[fillMaxWidth()]}
        >
          {rows}
        </Column>
      ) : null}
      {footer ? (
        <Caption modifiers={[padding(16, 4, 16, 0)]}>{footer}</Caption>
      ) : null}
    </Column>
  );
};

const RowIcon: React.FC<{ icon: FormIcon; color: string }> = ({
  icon,
  color,
}) => (
  <RNHostView matchContents>
    <MaterialDesignIcons name={icon.android} size={24} color={color} />
  </RNHostView>
);

const FormRow: React.FC<
  FormItemRowProps & {
    /** How the row takes a tap: clickable, toggleable or selectable. */
    action?: ModifierConfig;
    titleColor?: string;
    detailTint?: FormTextProps['detailTint'];
    /** Crossed out. */
    struck?: boolean;
    trailing?: ReactNode;
  }
> = ({
  title,
  subtitle,
  icon,
  testID,
  position,
  action,
  titleColor,
  struck,
  detail,
  detailTint,
  trailing,
  done,
  progress,
}) => {
  const colors = useMaterialColors();
  const theme = useTheme();
  // At large font sizes the detail goes under the subtitle instead of at the
  // end, which would squeeze the title into a narrow column.
  const { fontScale } = useWindowDimensions();
  const stackDetail = !!detail && fontScale >= 1.5;
  const supporting = stackDetail
    ? [subtitle, detail].filter(Boolean).join('\n')
    : subtitle;
  // Over: the text in the secondary color, with a check at the end.
  const contentColor = done ? colors.outline : titleColor;
  const check = done ? (
    <RNHostView matchContents>
      {/* sized: an unsized wrapper collapses to nothing in the host */}
      <View accessible accessibilityLabel={t('a11yDone')} style={styles.check}>
        <MaterialDesignIcons name="check" size={20} color={colors.outline} />
      </View>
    </RNHostView>
  ) : null;
  const ends = [
    detail && !stackDetail ? (
      <Text
        key="detail"
        color={
          done
            ? colors.outline
            : detailTint === 'accent'
              ? colors.primary
              : detailTint === 'warning'
                ? theme.colors.status.orange
                : colors.onSurfaceVariant
        }
        style={
          detailTint === 'accent'
            ? { typography: 'titleLarge' }
            : detailTint === 'warning'
              ? { typography: 'labelLarge' }
              : undefined
        }
      >
        {detail}
      </Text>
    ) : null,
    check ? <Fragment key="check">{check}</Fragment> : null,
    trailing ? <Fragment key="trailing">{trailing}</Fragment> : null,
  ].filter(Boolean);
  const end =
    ends.length > 1 ? (
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 8 }}>
        {ends}
      </Row>
    ) : (
      ends[0]
    );
  const item = (rowModifiers: ModifierConfig[]) => (
    <ListItem
      colors={{ containerColor: colors.surfaceContainer }}
      modifiers={[fillMaxWidth(), ...rowModifiers]}
    >
      <ListItem.HeadlineContent>
        <Text
          color={contentColor}
          style={struck ? { textDecoration: 'lineThrough' } : undefined}
        >
          {title}
        </Text>
      </ListItem.HeadlineContent>
      {supporting ? (
        <ListItem.SupportingContent>
          <Text color={done ? colors.outline : colors.onSurfaceVariant}>
            {supporting}
          </Text>
        </ListItem.SupportingContent>
      ) : null}
      {icon ? (
        <ListItem.LeadingContent>
          <RowIcon
            icon={icon}
            color={contentColor ?? colors.onSurfaceVariant}
          />
        </ListItem.LeadingContent>
      ) : null}
      {end ? <ListItem.TrailingContent>{end}</ListItem.TrailingContent> : null}
    </ListItem>
  );
  const rowModifiers = [
    rowShape(position),
    ...(action ? [action] : []),
    ...withTestID(testID),
  ];

  if (progress === undefined) {
    return item(rowModifiers);
  }
  // The bar goes under the whole item, across the row: in the supporting
  // slot it would stop where the trailing content starts.
  return (
    <Column
      modifiers={[
        fillMaxWidth(),
        rowShape(position),
        background(colors.surfaceContainer),
        ...(action ? [action] : []),
        ...withTestID(testID),
      ]}
    >
      {item([])}
      <LinearProgressIndicator
        progress={progress}
        modifiers={[fillMaxWidth(), padding(16, 0, 16, 16)]}
      />
    </Column>
  );
};

/** A row that only shows something. */
export const FormText: React.FC<FormTextProps> = row => <FormRow {...row} />;

/** A row that opens another page. Material lists don't show a chevron. */
export const FormLink: React.FC<FormLinkProps> = ({
  onPress,
  badge,
  ...row
}) => (
  <FormRow
    {...row}
    action={clickable(onPress)}
    trailing={badge ? <Badge /> : null}
  />
);

export const FormButton: React.FC<FormButtonProps> = ({
  onPress,
  destructive,
  loading,
  disabled,
  selected,
  ...row
}) => {
  const theme = useTheme();
  const colors = useMaterialColors();
  const run = () => {
    if (!loading) {
      onPress();
    }
  };
  const choice = selected !== undefined;
  return (
    <FormRow
      {...row}
      titleColor={
        disabled
          ? theme.colors.onSurfaceDisabled
          : destructive
            ? colors.error
            : undefined
      }
      action={
        disabled
          ? undefined
          : choice
            ? selectable(!!selected, run, 'radioButton')
            : clickable(run)
      }
      trailing={
        loading ? (
          <CircularProgressIndicator modifiers={[size(24, 24)]} />
        ) : choice ? (
          // The row takes the tap and reads the state to TalkBack.
          <RadioButton selected={!!selected} />
        ) : null
      }
    />
  );
};

/** A file that opens on tap. */
export const FormFile: React.FC<FormFileProps> = ({
  onPress,
  struck,
  disabled,
  ...row
}) => {
  const theme = useTheme();
  const colors = useMaterialColors();
  return (
    <FormRow
      {...row}
      struck={struck}
      titleColor={
        disabled
          ? theme.colors.onSurfaceDisabled
          : struck
            ? colors.onSurfaceVariant
            : undefined
      }
      action={disabled ? undefined : clickable(onPress)}
    />
  );
};

/**
 * Text the user writes: a filled field in the row's color and shape, without
 * the underline, so it reads as a row of the section.
 */
export const FormTextField: React.FC<FormTextFieldProps> = props => {
  const { placeholder, multiline, plain, disabled, testID, position } = props;
  const colors = useMaterialColors();
  const text = useNativeState(props.value);
  useFieldText(text, props);
  return (
    <TextField
      value={text}
      enabled={!disabled}
      singleLine={!multiline}
      minLines={multiline ? 6 : 1}
      keyboardOptions={
        plain
          ? { capitalization: 'none', autoCorrectEnabled: false }
          : { capitalization: 'sentences' }
      }
      colors={{
        focusedContainerColor: colors.surfaceContainer,
        unfocusedContainerColor: colors.surfaceContainer,
        disabledContainerColor: colors.surfaceContainer,
        focusedIndicatorColor: 'transparent',
        unfocusedIndicatorColor: 'transparent',
        disabledIndicatorColor: 'transparent',
      }}
      modifiers={[fillMaxWidth(), rowShape(position), ...withTestID(testID)]}
    >
      {placeholder ? (
        <TextField.Placeholder>
          <Text>{placeholder}</Text>
        </TextField.Placeholder>
      ) : null}
    </TextField>
  );
};

/** A bar under its title. */
export const FormProgress: React.FC<FormProgressProps> = ({
  title,
  value,
  testID,
  position,
}) => {
  return (
    <SectionItem position={position} testID={testID}>
      <ListItem.HeadlineContent>
        <Text>{title}</Text>
      </ListItem.HeadlineContent>
      <ListItem.SupportingContent>
        <LinearProgressIndicator
          progress={value}
          modifiers={[fillMaxWidth(), padding(0, 8, 0, 0)]}
        />
      </ListItem.SupportingContent>
    </SectionItem>
  );
};

export const FormToggle: React.FC<FormToggleProps> = ({
  value,
  onValueChange,
  disabled,
  loading,
  ...row
}) => (
  <FormRow
    {...row}
    action={
      loading
        ? undefined
        : toggleable(value, () => onValueChange(!value), {
            role: 'switch',
            enabled: !disabled,
          })
    }
    trailing={
      loading ? (
        <CircularProgressIndicator modifiers={[size(24, 24)]} />
      ) : (
        // No onCheckedChange: the row handles the tap and accessibility.
        <Switch value={value} enabled={!disabled} />
      )
    }
  />
);

export const FormNumberField: React.FC<FormNumberFieldProps> = ({
  value,
  onValueChange,
  ...row
}) => {
  const text = useNativeState(String(value));
  return (
    <FormRow
      {...row}
      trailing={
        <OutlinedTextField
          value={text}
          singleLine
          keyboardOptions={{ keyboardType: 'number' }}
          textStyle={{ textAlign: 'right' }}
          onValueChange={parseNumberInput(onValueChange)}
          modifiers={[width(96)]}
        />
      }
    />
  );
};

/** Text over several lines, filling the row. */
export const FormParagraph: React.FC<FormParagraphProps> = ({
  text,
  headline,
  testID,
  position,
}) => {
  return (
    <SectionItem position={position} testID={testID}>
      <ListItem.HeadlineContent>
        <Text style={{ typography: headline ? 'titleMedium' : 'bodyLarge' }}>
          {text}
        </Text>
      </ListItem.HeadlineContent>
    </SectionItem>
  );
};

/** The title of a detail page. */
export const FormTitle: React.FC<FormTitleProps> = ({
  title,
  subtitle,
  testID,
  position,
}) => {
  const colors = useMaterialColors();
  return (
    <SectionItem position={position} testID={testID}>
      <ListItem.HeadlineContent>
        <Text style={{ typography: 'headlineSmall' }}>{title}</Text>
      </ListItem.HeadlineContent>
      {subtitle ? (
        <ListItem.SupportingContent>
          <Text color={colors.onSurfaceVariant}>{subtitle}</Text>
        </ListItem.SupportingContent>
      ) : null}
    </SectionItem>
  );
};

/** A React Native view in the row, as wide as the row and as tall as itself. */
export const FormView: React.FC<FormViewProps> = ({ children, position }) => {
  const colors = useMaterialColors();
  return (
    <Column
      modifiers={[
        fillMaxWidth(),
        rowShape(position),
        background(colors.surfaceContainer),
        padding(16, 12, 16, 12),
      ]}
    >
      <RNHostView
        matchContents={{ vertical: true }}
        modifiers={[fillMaxWidth()]}
      >
        {children}
      </RNHostView>
    </Column>
  );
};

/** The account at the top of Settings. */
export const FormProfile: React.FC<FormProfileProps> = ({
  name,
  detail,
  position,
}) => {
  const theme = useTheme();
  return (
    <SectionItem position={position}>
      <ListItem.HeadlineContent>
        <Text style={{ typography: 'titleLarge' }}>{name}</Text>
      </ListItem.HeadlineContent>
      {detail ? (
        <ListItem.SupportingContent>
          <Text>{detail}</Text>
        </ListItem.SupportingContent>
      ) : null}
      <ListItem.LeadingContent>
        <RNHostView matchContents>
          <MaterialDesignIcons
            name="account-circle"
            size={56}
            color={theme.colors.primary}
          />
        </RNHostView>
      </ListItem.LeadingContent>
    </SectionItem>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  check: {
    width: 20,
    height: 20,
  },
});
