import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableStateCallbackType,
  type ViewProps,
} from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import {
  Button,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  ProgressBar,
  SpinButton,
  Spinner,
  Switch,
  Textarea,
} from '@fluentui/react-components';
import { BADGE_COLOR, DOT_SIZE } from 'components/Badge';
import SystemIcon from 'components/SystemIcon';
import { Caption, Headline, Text, Title } from 'components/Text';
import Spacing from 'constants/Spacing';
import { t } from 'helpers/i18n';
import useAppCommand from 'hooks/useAppCommand';
import { useTheme } from 'theme';
import {
  parseNumberInput,
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

export * from './Form.shared';

// The Electron app's form (Windows): Windows 11 Settings' cards, one per row,
// a few pixels apart on the window's background, with Fluent UI's controls
// (switches, spin buttons, text boxes, progress bars) in them.

/** React Native Web's pressable state, which also knows the pointer. */
type PressState = PressableStateCallbackType & { hovered?: boolean };

/** The window's refresh command (F5) refreshes the form on screen. */
const useRefreshCommand = (onRefresh?: () => Promise<void>) => {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) {
      return;
    }
    const subscriptions = [
      navigation.addListener('focus', () => setFocused(true)),
      navigation.addListener('blur', () => setFocused(false)),
    ];
    return () => subscriptions.forEach(remove => remove());
  }, [navigation]);
  const refreshing = useRef(false);
  useAppCommand(
    'refresh',
    () => {
      if (onRefresh && !refreshing.current) {
        refreshing.current = true;
        void onRefresh().finally(() => {
          refreshing.current = false;
        });
      }
    },
    !!onRefresh && focused,
  );
};

export const Form: React.FC<FormProps> = ({ children, onRefresh, testID }) => {
  const theme = useTheme();
  useRefreshCommand(onRefresh);
  return (
    <ScrollView
      testID={testID}
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {children}
    </ScrollView>
  );
};

/** The root view of a screen that is a Form: its background to the edges. */
export const FormScreen: React.FC<ViewProps> = ({ style, ...props }) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.fill, { backgroundColor: theme.colors.background }, style]}
      {...props}
    />
  );
};

export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  footer,
  footerHidden,
}) => (
  <View style={styles.section}>
    {title ? (
      <Text variant="label" role="heading" style={styles.sectionTitle}>
        {title}
      </Text>
    ) : null}
    <View style={styles.rows}>{keyedRows(children)}</View>
    {footer ? (
      <Caption
        style={[styles.footer, footerHidden && styles.hidden]}
        aria-hidden={footerHidden}
      >
        {footer}
      </Caption>
    ) : null}
  </View>
);

/**
 * The section's rows, as `sectionRows` flattens them, keyed by their path
 * through any fragments: a row inside a fragment has the fragment's own
 * keys, which can repeat the section's.
 */
const keyedRows = (children: ReactNode, path = ''): ReactNode[] =>
  Children.toArray(children).flatMap(child =>
    isValidElement<{ children?: ReactNode }>(child)
      ? child.type === Fragment
        ? keyedRows(child.props.children, `${path}${String(child.key)}/`)
        : [cloneElement(child, { key: `${path}${String(child.key)}` })]
      : [],
  );

/** A row's card: the surface, its stroke, and the hover and press fills. */
const useCardStyle = () => {
  const theme = useTheme();
  return ({ hovered, pressed }: Partial<PressState> = {}) => [
    styles.card,
    {
      backgroundColor: theme.colors.surfaceContainer,
      borderColor: theme.colors.surfaceDisabled,
    },
    (hovered || pressed) && {
      backgroundColor: pressed
        ? theme.colors.surfaceVariant
        : theme.colors.secondaryContainer,
    },
  ];
};

const Card: React.FC<{
  children: ReactNode;
  testID?: string;
  onPress?: () => void;
  disabled?: boolean;
  role?: 'button' | 'link' | 'radio';
  selected?: boolean;
  accessibilityLabel?: string;
}> = ({
  children,
  testID,
  onPress,
  disabled,
  role,
  selected,
  accessibilityLabel,
}) => {
  const cardStyle = useCardStyle();
  return onPress ? (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      role={role ?? 'button'}
      aria-checked={role === 'radio' ? !!selected : undefined}
      aria-disabled={disabled}
      aria-label={accessibilityLabel}
      style={state => (disabled ? cardStyle() : cardStyle(state as PressState))}
    >
      {children}
    </Pressable>
  ) : (
    <View testID={testID} style={cardStyle()}>
      {children}
    </View>
  );
};

const RowIcon: React.FC<{ icon?: FormIcon; dimmed?: boolean }> = ({
  icon,
  dimmed,
}) => {
  const theme = useTheme();
  return icon ? (
    <SystemIcon
      name={icon}
      size={20}
      color={dimmed ? theme.colors.onSurfaceDisabled : theme.colors.primary}
    />
  ) : null;
};

const RowLabel: React.FC<{
  title: string;
  subtitle?: string;
  overline?: string;
  item?: boolean;
  struck?: boolean;
  color?: string;
}> = ({ title, subtitle, overline, item, struck, color }) => {
  const theme = useTheme();
  return (
    <View style={styles.label}>
      {overline ? (
        <Caption
          style={[styles.overline, { color: theme.colors.primary as string }]}
        >
          {overline}
        </Caption>
      ) : null}
      <Text
        style={[
          item && styles.item,
          struck && styles.struck,
          (struck || color) && {
            color: color ?? (theme.colors.onSurfaceMedium as string),
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? <Caption>{subtitle}</Caption> : null}
    </View>
  );
};

const RowDetail: React.FC<{
  detail?: string;
  tint?: FormItemRowProps['detailTint'];
}> = ({ detail, tint }) => {
  const theme = useTheme();
  if (!detail) {
    return null;
  }
  return tint === 'accent' ? (
    <Title style={{ color: theme.colors.primary }}>{detail}</Title>
  ) : (
    <Text
      style={[
        styles.detail,
        tint
          ? [styles.tinted, { color: theme.colors.onStatusContainer[tint] }]
          : { color: theme.colors.onSurfaceMedium },
      ]}
    >
      {detail}
    </Text>
  );
};

const Chevron = () => {
  const theme = useTheme();
  return (
    <SystemIcon name="forward" size={16} color={theme.colors.onSurfaceMedium} />
  );
};

/** The inside of a row: icon, text, detail and what comes after. */
const RowContent: React.FC<
  FormItemRowProps & { trailing?: ReactNode; badge?: boolean }
> = ({
  title,
  subtitle,
  overline,
  icon,
  detail,
  item,
  done,
  progress,
  detailTint,
  trailing,
  badge,
}) => (
  <View style={styles.rowWithProgress}>
    <View style={[styles.row, done && styles.done]}>
      <RowIcon icon={icon} />
      <RowLabel
        title={title}
        subtitle={subtitle}
        overline={overline}
        item={item}
      />
      <RowDetail detail={detail} tint={done ? undefined : detailTint} />
      {badge ? (
        <View
          style={[styles.badge, { backgroundColor: BADGE_COLOR }]}
          aria-label={t('a11yNewBadge')}
        />
      ) : null}
      {trailing}
    </View>
    {progress !== undefined ? (
      <ProgressBar value={progress} max={1} thickness="medium" />
    ) : null}
  </View>
);

export const FormText: React.FC<FormTextProps> = ({
  testID,
  action,
  done,
  ...row
}) => (
  <Card testID={testID}>
    <RowContent
      {...row}
      done={done}
      trailing={
        action ? (
          <Button
            appearance="secondary"
            onClick={action.onPress}
            data-testid={action.testID}
          >
            {action.title}
          </Button>
        ) : undefined
      }
    />
    {done ? <View aria-label={t('a11yDone')} /> : null}
  </Card>
);

/** A row that opens another page, with the chevron. */
export const FormLink: React.FC<FormLinkProps> = ({
  testID,
  onPress,
  badge,
  ...row
}) => (
  <Card testID={testID} onPress={onPress} role="link">
    <RowContent {...row} badge={badge} trailing={<Chevron />} />
  </Card>
);

/** A row that does something right away, or a choice of a list. */
export const FormButton: React.FC<FormButtonProps> = ({
  title,
  subtitle,
  icon,
  testID,
  detail,
  onPress,
  destructive,
  loading,
  disabled,
  selected,
}) => {
  const theme = useTheme();
  const choice = selected !== undefined;
  return (
    <Card
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      role={choice ? 'radio' : 'button'}
      selected={selected}
    >
      <View style={styles.row}>
        <RowIcon icon={icon} dimmed={disabled} />
        <RowLabel
          title={title}
          subtitle={subtitle}
          color={
            disabled
              ? (theme.colors.onSurfaceDisabled as string)
              : destructive
                ? (theme.colors.onStatusContainer.red as string)
                : choice
                  ? undefined
                  : (theme.colors.primary as string)
          }
        />
        <RowDetail detail={detail} />
        {loading ? <Spinner size="tiny" /> : null}
        {selected ? (
          <SystemIcon name="checked" size={20} color={theme.colors.primary} />
        ) : null}
      </View>
    </Card>
  );
};

/**
 * A row that asks which of a few things to do: a Fluent menu under the row,
 * as Windows drops a flyout from what was clicked.
 */
export const FormChoiceButton: React.FC<FormChoiceButtonProps> = ({
  sheet: { choices, onCancel },
  disabled,
  ...row
}) => {
  const theme = useTheme();
  // The row's element, for the menu to drop from
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // The menu reports closing after a choice's click, as when dismissed.
  const chose = useRef(false);
  return (
    <View ref={view => setAnchor(view as unknown as HTMLElement | null)}>
      <FormButton
        {...row}
        disabled={disabled}
        onPress={() => {
          chose.current = false;
          setOpen(true);
        }}
      />
      <Menu
        open={open}
        onOpenChange={(_event, data) => {
          setOpen(data.open);
          // A choice's click runs after the menu reports closing.
          if (!data.open) {
            setTimeout(() => {
              if (!chose.current) {
                onCancel?.();
              }
            });
          }
        }}
        positioning={{
          target: anchor,
          position: 'below',
          align: 'start',
        }}
      >
        <MenuPopover>
          <MenuList>
            {choices.map(choice => (
              <MenuItem
                key={choice.label}
                style={
                  choice.destructive
                    ? { color: theme.colors.onStatusContainer.red as string }
                    : undefined
                }
                onClick={() => {
                  chose.current = true;
                  choice.onPress();
                }}
              >
                {choice.label}
              </MenuItem>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>
    </View>
  );
};

/** A file that opens on click, with the chevron of a link. */
export const FormFile: React.FC<FormFileProps> = ({
  title,
  subtitle,
  icon,
  testID,
  detail,
  onPress,
  struck,
  disabled,
}) => (
  <Card testID={testID} onPress={onPress} disabled={disabled} role="link">
    <View style={styles.row}>
      <RowIcon icon={icon} dimmed={disabled} />
      <RowLabel title={title} subtitle={subtitle} struck={struck} />
      <RowDetail detail={detail} />
      <Chevron />
    </View>
  </Card>
);

/**
 * Text the user writes, the whole width of the row: a text box, or a text
 * area six lines tall that grows with its text.
 */
export const FormTextField: React.FC<FormTextFieldProps> = ({
  value,
  onChangeText,
  format,
  placeholder,
  label,
  multiline,
  plain,
  disabled,
  testID,
}) => {
  const [text, setText] = useState(value);
  // A `value` that changes from outside (a cleared draft) replaces the text;
  // the echo of what was typed changes nothing.
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    setText(value);
  }
  const handleChange = (typed: string) => {
    const formatted = format ? format(typed) : typed;
    setText(formatted);
    onChangeText(formatted);
  };
  const shared = {
    value: text,
    placeholder,
    disabled,
    'aria-label': label ?? placeholder,
    'data-testid': testID,
    autoCapitalize: plain ? 'off' : 'sentences',
    autoCorrect: plain ? 'off' : 'on',
    spellCheck: !plain,
    appearance: 'outline' as const,
  };
  return (
    <View style={styles.field}>
      {multiline ? (
        <Textarea
          {...shared}
          resize="vertical"
          rows={6}
          textarea={{ style: { minHeight: 132 } }}
          onChange={(_event, data) => handleChange(data.value)}
        />
      ) : (
        <Input
          {...shared}
          onChange={(_event, data) => handleChange(data.value)}
        />
      )}
    </View>
  );
};

export const FormToggle: React.FC<FormToggleProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
  disabled,
  loading,
}) => {
  const theme = useTheme();
  return (
    <Card testID={testID}>
      <View style={styles.row}>
        <RowIcon icon={icon} />
        <RowLabel title={title} />
        {loading ? (
          <Spinner size="tiny" />
        ) : (
          <View style={styles.toggle}>
            <Caption style={{ color: theme.colors.onSurfaceHigh }}>
              {value ? t('on') : t('off')}
            </Caption>
            <Switch
              checked={value}
              disabled={disabled}
              aria-label={title}
              onChange={(_event, data) => onValueChange(data.checked)}
            />
          </View>
        )}
      </View>
    </Card>
  );
};

/** A number typed at the end of the row: Fluent's spin button. */
export const FormNumberField: React.FC<FormNumberFieldProps> = ({
  title,
  icon,
  testID,
  value,
  onValueChange,
}) => {
  const [shown, setShown] = useState<number>(value);
  const apply = parseNumberInput(number => {
    setShown(number);
    onValueChange(number);
  });
  return (
    <Card testID={testID}>
      <View style={styles.row}>
        <RowIcon icon={icon} />
        <RowLabel title={title} />
        <SpinButton
          value={shown}
          min={1}
          aria-label={title}
          className="learnx-number"
          style={{ width: 96 }}
          onChange={(_event, data) =>
            apply(String(data.value ?? data.displayValue ?? ''))
          }
        />
      </View>
    </Card>
  );
};

/** Text over several lines, filling the row; it can be selected. */
export const FormParagraph: React.FC<FormParagraphProps> = ({
  text,
  headline,
  testID,
}) => (
  <Card testID={testID}>
    {headline ? (
      <Headline selectable>{text}</Headline>
    ) : (
      <Text selectable>{text}</Text>
    )}
  </Card>
);

/** The title of a detail page, above its rows. */
export const FormTitle: React.FC<FormTitleProps> = ({
  title,
  subtitle,
  testID,
}) => (
  <View testID={testID} style={styles.title}>
    <Title variant="largeTitle" role="heading" selectable>
      {title}
    </Title>
    {subtitle ? <Caption variant="body">{subtitle}</Caption> : null}
  </View>
);

/**
 * A React Native view in the row, as wide as the row and as tall as itself.
 * The view stays mounted under the spinner while it loads.
 */
export const FormView: React.FC<FormViewProps> = ({ children, loading }) => (
  <Card>
    {loading ? (
      <View style={styles.loading}>
        <Spinner size="small" />
      </View>
    ) : null}
    {children}
  </Card>
);

/** The account at the top of Settings, as the account card of Windows Settings. */
export const FormProfile: React.FC<FormProfileProps> = ({ name, detail }) => {
  const theme = useTheme();
  return (
    <View style={styles.profile}>
      <View
        style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
        aria-hidden
      >
        <SystemIcon name="person" size={32} color={theme.colors.onPrimary} />
      </View>
      <View style={styles.label}>
        <Title>{name}</Title>
        {detail ? <Caption variant="body">{detail}</Caption> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.l,
    paddingBottom: Spacing.xl,
    gap: Spacing.l,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.s,
  },
  sectionTitle: {
    paddingTop: Spacing.xs,
  },
  rows: {
    gap: 4,
  },
  footer: {
    paddingHorizontal: Spacing.xs,
  },
  hidden: {
    opacity: 0,
  },
  card: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: Spacing.m,
    paddingVertical: 12,
    minHeight: 52,
    justifyContent: 'center',
    // The pointer's fill fades in and out, as Fluent's controls do.
    transitionProperty: 'background-color',
    transitionDuration: '100ms',
  } as object,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
  },
  rowWithProgress: {
    gap: Spacing.s,
  },
  done: {
    opacity: 0.5,
  },
  // The label takes the row; when the row is short of room, it and the
  // detail both wrap, each by its length.
  label: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    gap: 2,
  },
  overline: {
    fontWeight: '600',
  },
  item: {
    fontWeight: '500',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  detail: {
    textAlign: 'right',
    flexShrink: 1,
  },
  tinted: {
    fontWeight: '600',
  },
  badge: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  field: {
    gap: Spacing.xs,
  },
  title: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  loading: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingVertical: Spacing.s,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
