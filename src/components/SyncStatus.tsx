import { StyleSheet, View, useWindowDimensions } from 'react-native';
import dayjs from 'dayjs';
import SystemIcon from 'components/SystemIcon';
import { requestRelogin, useAuthStore } from 'data/auth';
import { t } from 'helpers/i18n';
import { Caption } from 'components/Text';
import { FormButton, FormSection, FormText } from 'components/Form';
import TextButton from 'components/TextButton';
import { useMinute } from 'hooks/useClock';
import { useTheme } from 'theme';

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
 * A line at the top of a list (its header, so it scrolls with the list)
 * while there's no session; see `useSyncStatus`.
 */
const SyncStatus: React.FC<SyncStatusProps> = ({ updatedAt }) => {
  const theme = useTheme();
  // At large font sizes the button gets its own line, so the message isn't
  // squeezed into a few characters.
  const stacked = useWindowDimensions().fontScale >= 1.5;
  const sync = useSyncStatus(updatedAt);

  if (!sync) {
    return null;
  }
  const { icon, status, updated, canLogIn } = sync;

  return (
    <View
      testID="sync-status"
      style={[
        styles.root,
        stacked && styles.stacked,
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
      accessibilityLiveRegion="polite"
    >
      <SystemIcon
        name={icon}
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
      {canLogIn && (
        <View style={stacked ? styles.stackedButton : styles.button}>
          <TextButton
            testID="sync-status-relogin"
            size="small"
            bold
            onPress={requestRelogin}
          >
            {t('syncStatusLogInAgain')}
          </TextButton>
        </View>
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
  },
  stacked: {
    flexWrap: 'wrap',
  },
  stackedButton: {
    flexBasis: '100%',
    alignItems: 'flex-start',
    paddingLeft: 24,
  },
});

/**
 * The same status as the first section of a `Form`, which scrolls under the
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
      />
      {sync.canLogIn && (
        <FormButton
          testID="sync-status-relogin"
          title={t('syncStatusLogInAgain')}
          onPress={requestRelogin}
        />
      )}
    </FormSection>
  );
};

export default SyncStatus;
