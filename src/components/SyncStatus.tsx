import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import Icon from '@react-native-vector-icons/material-icons';
import { requestRelogin, useAuthStore } from 'data/auth';
import { t } from 'helpers/i18n';
import { Caption } from 'components/Text';
import TextButton from 'components/TextButton';
import { useTheme } from 'theme';

export interface SyncStatusProps {
  /** When the list's data was last fetched (ms), 0 if never. */
  updatedAt?: number;
}

/**
 * A line above a list while there's no session: offline, or the saved login
 * failed, with how old the shown data is. A failed login offers to log in
 * again; going offline retries by itself (hooks/useReLogin).
 */
const SyncStatus: React.FC<SyncStatusProps> = ({ updatedAt }) => {
  const theme = useTheme();
  const loggedIn = useAuthStore(state => state.loggedIn);
  const loggingIn = useAuthStore(state => state.loggingIn);
  const failure = useAuthStore(state => state.failure);
  const visible = !loggedIn && failure !== null;

  // Keeps "updated … ago" current.
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const status = loggingIn
    ? t('syncStatusReconnecting')
    : failure === 'offline'
      ? t('syncStatusOffline')
      : t('syncStatusLoginFailed');
  const updated = updatedAt
    ? t('syncStatusUpdated').replace('{time}', dayjs(updatedAt).fromNow())
    : null;

  return (
    <View
      testID="sync-status"
      style={[styles.root, { backgroundColor: theme.colors.surfaceVariant }]}
      accessibilityLiveRegion="polite"
    >
      <Icon
        name={failure === 'offline' ? 'cloud-off' : 'error-outline'}
        size={16}
        color={theme.colors.onSurfaceVariant}
        style={styles.icon}
      />
      <Caption
        style={[styles.text, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={2}
      >
        {updated ? `${status} · ${updated}` : status}
      </Caption>
      {failure === 'rejected' && !loggingIn && (
        <TextButton
          testID="sync-status-relogin"
          containerStyle={styles.button}
          style={styles.buttonLabel}
          onPress={requestRelogin}
        >
          {t('syncStatusLogInAgain')}
        </TextButton>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
  },
  button: {
    marginLeft: 8,
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default SyncStatus;
