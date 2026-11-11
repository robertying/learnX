// Debug builds only, so nothing here is translated.
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormLink,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { toast } from 'components/Toast';
import {
  assignmentsQuery,
  filesQuery,
  noticesQuery,
  useAssignments,
  useFiles,
  useNotices,
} from 'data/content';
import { useCredentialsStore } from 'data/credentials';
import { queryClient } from 'data/queryClient';
import { describeSyncRun, useSyncLogStore } from 'data/syncLog';
import { getUserData } from 'data/userData';
import { notifyContent, syncContent } from 'helpers/background';
import { previewDeadlineReminder } from 'helpers/deadlineReminders';
import { t } from 'helpers/i18n';
import { isMockUser } from 'helpers/mock';
import { postNotification } from 'helpers/notifications';
import {
  postNotificationSamples,
  sampleNoticeNotification,
} from 'helpers/notificationSamples';
import {
  getServerWritesAllowed,
  setServerWritesAllowed,
  subscribeServerWrites,
} from 'helpers/serverWrites';
import useNotificationPermission from 'hooks/useNotificationPermission';
import { useShowDetail } from 'hooks/useDetailNavigator';
import { mockNetworkTitle } from 'navigation/options';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Debug'>;

/**
 * Forgets a few items and grades, then syncs as the background task does, so
 * what comes back is posted as new.
 */
const simulateNewContent = async () => {
  const semesterId = getUserData().currentSemester;
  if (!semesterId) {
    return;
  }
  queryClient.setQueryData(noticesQuery(semesterId).queryKey, old =>
    old?.slice(3),
  );
  queryClient.setQueryData(filesQuery(semesterId).queryKey, old =>
    old?.slice(3),
  );
  queryClient.setQueryData(assignmentsQuery(semesterId).queryKey, old =>
    old
      ?.filter(a => a.submitted || dayjs(a.deadline).isBefore(dayjs()))
      .map(a => (a.graded ? { ...a, graded: false } : a)),
  );
  const result = await syncContent({ manual: true });
  const run = useSyncLogStore.getState().runs.at(-1);
  const summary = run ? describeSyncRun(run) : result.status;
  if (result.status !== 'synced') {
    toast(summary, 'error');
    return;
  }
  const posted = await notifyContent(result.diff, { inForeground: true });
  toast(`${posted.length} posted, ${summary}`, 'success');
};

const previewReminder = async () => {
  const scheduled = await previewDeadlineReminder();
  toast(
    scheduled > 0
      ? `The next of ${scheduled} scheduled reminders shows again in 10 seconds. Leave the app to see it.`
      : 'No deadline reminders are scheduled.',
    scheduled > 0 ? 'success' : 'warning',
  );
};

/**
 * The debug build's tools in one place, opened from Today's header: network
 * emulation for the mock account, server writes for a real one, and ways to
 * see each kind of notification.
 */
const Debug: React.FC<Props> = ({ navigation }) => {
  const show = useShowDetail(navigation);
  const username = useCredentialsStore(state => state.credentials?.username);
  const serverWritesAllowed = useSyncExternalStore(
    subscribeServerWrites,
    getServerWritesAllowed,
  );
  const { request } = useNotificationPermission();
  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();
  const lastBackgroundSync = useSyncLogStore(state =>
    state.runs.findLast(run => !run.manual),
  );

  /** Runs `action` once notifications are allowed. */
  const withPermission = (action: () => Promise<void>) => async () => {
    if (!(await request())) {
      toast(t('notificationPermissionDenied'), 'error');
      return;
    }
    await action();
  };

  const sendTestNotification = async () => {
    const notice = notices[0];
    await postNotification(
      notice
        ? sampleNoticeNotification(notice)
        : {
            title: 'learnX',
            body: t('notifications'),
            target: { type: 'notice' },
          },
    );
  };

  return (
    <FormScreen>
      <Form>
        {isMockUser(username) ? (
          <FormSection footer="The mock account's changes go to the emulated server and never reach the real one or CourseX, so it has no Allow Server Writes.">
            <FormLink
              testID="debug-mock-network"
              icon="network"
              title={mockNetworkTitle}
              onPress={() => show('MockNetwork')}
            />
          </FormSection>
        ) : (
          <FormSection footer="Debug builds don't submit assignments, share course information or sync favorites until this is on. Favorites changed meanwhile wait and are sent when it's turned on. It turns off again when the app reloads.">
            <FormToggle
              testID="debug-allow-server-writes"
              icon="warning"
              title="Allow Server Writes"
              value={serverWritesAllowed}
              onValueChange={setServerWritesAllowed}
            />
          </FormSection>
        )}
        <FormSection
          title="Notifications"
          footer={
            lastBackgroundSync
              ? `Last background sync ${dayjs(lastBackgroundSync.startedAt).format(t('shortDateTimeFormat'))}: ${describeSyncRun(lastBackgroundSync)}`
              : undefined
          }
        >
          <FormButton
            icon="send"
            title="Send a Test Notification"
            onPress={withPermission(sendTestNotification)}
          />
          <FormButton
            icon="notifications"
            title="Post Every Notification Format"
            onPress={withPermission(async () => {
              const posted = await postNotificationSamples({
                notices,
                assignments,
                files,
              });
              toast(`${posted} posted`, 'success');
            })}
          />
          <FormButton
            icon="sync"
            title="Simulate New Content"
            onPress={withPermission(simulateNewContent)}
          />
          <FormButton
            icon="reminder"
            title="Preview a Deadline Reminder"
            onPress={previewReminder}
          />
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default Debug;
