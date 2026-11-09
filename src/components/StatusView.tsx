import { StyleSheet, View } from 'react-native';
import Styles from 'constants/Styles';
import SystemIcon from 'components/SystemIcon';
import { Text } from 'components/Text';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme } from 'theme';

export interface StatusViewProps {
  icon: SystemIconName;
  message: string;
  /** Something to do about it, such as a button, under the message. */
  action?: React.ReactNode;
  testID?: string;
}

/**
 * A screen or list with nothing to show, and why: a large dimmed icon over a
 * line of text, centered in the space it has. `Empty`, `NotFound` and the
 * error boundary's fallback are this view.
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
      <SystemIcon
        style={Styles.spacey1}
        name={icon}
        color={theme.colors.outline}
        size={56}
      />
      <Text style={[Styles.spacey1, { color: theme.colors.onSurfaceMedium }]}>
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
  },
});

export default StatusView;
