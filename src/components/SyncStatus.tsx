import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import SystemIcon from 'components/SystemIcon';
import { requestRelogin, useAuthStore } from 'data/auth';
import { t } from 'helpers/i18n';
import { Caption, Text } from 'components/Text';
import { FormSection, FormText } from 'components/Form';
import TextButton from 'components/TextButton';
import { useMinute } from 'hooks/useClock';
import { useTheme } from 'theme';
import Spacing from 'constants/Spacing';

export interface SyncStatusProps {
  /** When the list's data was last fetched (ms), 0 if never. */
  updatedAt?: number;
}

/**
 * What a list says while there's no session: offline, or the saved login
 * failed, with how old the shown data is, or null with a session. A failed
 * login offers to log in again; going offline retries by itself
 * (hooks/useReLogin).
 */
const useSyncStatus = (updatedAt?: number) => {
  const loggedIn = useAuthStore(state => state.loggedIn);
  const loggingIn = useAuthStore(state => state.loggingIn);
  const failure = useAuthStore(state => state.failure);

  // Keeps "updated … ago" current.
  const now = useMinute();

  if (loggedIn || failure === null) {
    return null;
  }

  return {
    icon: failure === 'offline' ? ('offline' as const) : ('error' as const),
    status: loggingIn
      ? t('syncStatusReconnecting')
      : failure === 'offline'
        ? t('syncStatusOffline')
        : t('syncStatusLoginFailed'),
    updated: updatedAt
      ? t('syncStatusUpdated', { time: dayjs(updatedAt).from(now) })
      : null,
    canLogIn: failure === 'rejected' && !loggingIn,
  };
};

/**
 * One row at the top of a list (its header, so it scrolls with the list)
 * while there's no session: the status with how old the data is under it,
 * and Log In at the end after a rejected login. Today shows the same row in
 * its Form (`SyncStatusSection`).
 */
const SyncStatus: React.FC<SyncStatusProps> = ({ updatedAt }) => {
  const theme = useTheme();
  const sync = useSyncStatus(updatedAt);

  if (!sync) {
    return null;
  }
  const { icon, status, updated, canLogIn } = sync;

  return (
    <View
      testID="sync-status"
      style={[styles.root, { backgroundColor: theme.colors.surfaceVariant }]}
      accessibilityLiveRegion="polite"
    >
      <SystemIcon
        name={icon}
        size={20}
        color={theme.colors.primary}
        style={styles.icon}
      />
      <View style={styles.text}>
        <Text variant="subheadline">{status}</Text>
        {updated ? <Caption style={styles.flush}>{updated}</Caption> : null}
      </View>
      {canLogIn && (
        <TextButton testID="sync-status-relogin" bold onPress={requestRelogin}>
          {t('syncStatusLogIn')}
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
    paddingVertical: 8,
  },
  icon: {
    marginRight: 12,
  },
  // The status and its time a fixed gap apart, as one block centered in the
  // row: a Caption's own margins would add space under it only.
  text: {
    flex: 1,
    marginRight: Spacing.s,
    gap: 2,
  },
  flush: {
    marginVertical: 0,
  },
});

/**
 * The same row as the first section of a `Form`, which scrolls under the
 * header like the rest of the Form (Today).
 */
export const SyncStatusSection: React.FC<SyncStatusProps> = ({ updatedAt }) => {
  const sync = useSyncStatus(updatedAt);

  if (!sync) {
    return null;
  }

  return (
    <FormSection>
      <FormText
        testID="sync-status"
        icon={sync.icon}
        title={sync.status}
        subtitle={sync.updated ?? undefined}
        action={
          sync.canLogIn
            ? {
                title: t('syncStatusLogIn'),
                onPress: requestRelogin,
                testID: 'sync-status-relogin',
              }
            : undefined
        }
      />
    </FormSection>
  );
};

export default SyncStatus;
