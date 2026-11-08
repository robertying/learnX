import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  Badge,
  CircularProgressIndicator,
  Column,
  Host,
  LazyColumn,
  ListItem,
  OutlinedTextField,
  PullToRefreshBox,
  RadioButton,
  RNHostView,
  Row,
  Switch,
  Text,
  useMaterialColors,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
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
import {
  parseNumberInput,
  positionRows,
  type FormButtonProps,
  type FormIcon,
  type FormLinkProps,
  type FormNumberFieldProps,
  type FormProfileProps,
  type FormProps,
  type FormRowPosition,
  type FormSectionProps,
  type FormTextProps,
  type FormToggleProps,
} from './Form.shared';

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

const FormContent: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  const colors = useMaterialColors();
  const [refreshing, setRefreshing] = useState(false);

  const list = (
    <LazyColumn
      verticalArrangement={{ spacedBy: 24 }}
      contentPadding={{ start: 16, end: 16, top: 16, bottom: 16 }}
      modifiers={[fillMaxSize(), ...(testID ? [testIDModifier(testID)] : [])]}
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
    <Host
      style={[styles.fill, { backgroundColor: theme.colors.surface }]}
      seedColor={theme.colors.primary}
    >
      <FormContent {...props} />
    </Host>
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

const FormRow: React.FC<{
  title: string;
  icon?: FormIcon;
  testID?: string;
  position?: FormRowPosition;
  /** How the row takes a tap: clickable, toggleable or selectable. */
  action?: ModifierConfig;
  titleColor?: string;
  detail?: string;
  trailing?: ReactNode;
}> = ({
  title,
  icon,
  testID,
  position,
  action,
  titleColor,
  detail,
  trailing,
}) => {
  const colors = useMaterialColors();
  const end =
    detail && trailing ? (
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 8 }}>
        <Text color={colors.onSurfaceVariant}>{detail}</Text>
        {trailing}
      </Row>
    ) : detail ? (
      <Text color={colors.onSurfaceVariant}>{detail}</Text>
    ) : (
      trailing
    );
  return (
    <ListItem
      colors={{ containerColor: colors.surfaceContainer }}
      modifiers={[
        fillMaxWidth(),
        rowShape(position),
        ...(action ? [action] : []),
        ...(testID ? [testIDModifier(testID)] : []),
      ]}
    >
      <ListItem.HeadlineContent>
        <Text color={titleColor}>{title}</Text>
      </ListItem.HeadlineContent>
      {icon ? (
        <ListItem.LeadingContent>
          <RowIcon icon={icon} color={titleColor ?? colors.onSurfaceVariant} />
        </ListItem.LeadingContent>
      ) : null}
      {end ? <ListItem.TrailingContent>{end}</ListItem.TrailingContent> : null}
    </ListItem>
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
  selected,
  ...row
}) => {
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
      titleColor={destructive ? colors.error : undefined}
      action={
        choice ? selectable(!!selected, run, 'radioButton') : clickable(run)
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

/** The account at the top of Settings. */
export const FormProfile: React.FC<FormProfileProps> = ({
  name,
  detail,
  position,
}) => {
  const theme = useTheme();
  const colors = useMaterialColors();
  return (
    <ListItem
      colors={{ containerColor: colors.surfaceContainer }}
      modifiers={[fillMaxWidth(), rowShape(position)]}
    >
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
    </ListItem>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
