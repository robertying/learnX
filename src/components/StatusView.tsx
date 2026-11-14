import { StyleSheet, View } from 'react-native';
import SystemIcon from 'components/SystemIcon';
import { Text } from 'components/Text';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';

export interface StatusViewProps {
  /** Left out where there's no content to stand for, like the empty detail
   * pane, which then shows its message alone, larger. */
  icon?: SystemIconName;
  message: string;
  /** Something to do about it, such as a button, under the message. */
  action?: React.ReactNode;
  testID?: string;
}

/**
 * A screen or list with nothing to show, and why: a large dimmed icon over a
 * line of text, centered in the space it has, as in iOS's
 * `ContentUnavailableView`. `Empty`, `NotFound`, search with no results and
 * the error boundary's fallback are this view. The empty detail pane is its
 * text alone, as in Mail's "No Message Selected": nothing is missing there,
 * so there's nothing for an icon to stand for.
 */
const StatusView: React.FC<StatusViewProps> = ({
  icon,
  message,
  action,
  testID,
}) => {
  const theme = useTheme();

  return (
    <View testID={testID} style={styles.root}>
      {icon ? (
        <SystemIcon name={icon} color={theme.colors.outline} size={56} />
      ) : null}
      <Text
        variant={icon ? 'body' : 'title'}
        style={[styles.message, { color: theme.colors.onSurfaceMedium }]}
      >
        {message}
      </Text>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  message: {
    textAlign: 'center',
  },
});

export default StatusView;
