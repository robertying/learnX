import { Platform, StyleSheet, View } from 'react-native';
import SystemIcon from 'components/SystemIcon';
import { Text, textStyles } from 'components/Text';
import TextButton from 'components/TextButton';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';

export interface StatusViewAction {
  /** A button label, in Title Case ("Try Again"). */
  label: string;
  onPress: () => void;
}

export interface StatusViewProps {
  /**
   * What's missing or went wrong. Left out where nothing is missing, like the
   * empty detail pane, which then shows its title alone, dimmed.
   */
  icon?: SystemIconName;
  /** In Title Case: "No Notices", "Couldn't Download File". */
  title: string;
  /** A sentence on why, or what to do, under the title. */
  description?: string;
  /** Buttons under the text, in order: the likely one first. */
  actions?: StatusViewAction[];
  testID?: string;
}

/**
 * A screen or list with nothing to show, or that failed, and why: a large
 * dimmed icon, a title, an optional description and optional buttons,
 * centered in the space it has, as in iOS's `ContentUnavailableView` and
 * Material's empty states. Every empty and error state is this view.
 */
// The large dimmed icon: 56 pt beside iOS's text and Material's, and as
// much smaller on the Mac as its large title (26 pt for 34) is.
const iconSize = Platform.select({
  android: 56,
  default: Math.round(((textStyles.largeTitle.fontSize ?? 34) * 56) / 34),
});

const StatusView: React.FC<StatusViewProps> = ({
  icon,
  title,
  description,
  actions,
  testID,
}) => {
  const theme = useTheme();

  return (
    <View testID={testID} style={styles.root}>
      {icon ? (
        <SystemIcon
          name={icon}
          color={theme.colors.outline}
          size={iconSize}
          style={styles.icon}
        />
      ) : null}
      <Text
        variant="title"
        accessibilityRole="header"
        style={[
          styles.text,
          {
            color: icon ? theme.colors.onSurface : theme.colors.onSurfaceMedium,
          },
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          variant="subheadline"
          style={[styles.text, { color: theme.colors.onSurfaceMedium }]}
        >
          {description}
        </Text>
      ) : null}
      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map(action => (
            <TextButton key={action.label} onPress={action.onPress}>
              {action.label}
            </TextButton>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 4,
  },
  icon: {
    marginBottom: 12,
  },
  text: {
    textAlign: 'center',
    maxWidth: 480,
  },
  actions: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
});

export default StatusView;
