import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import {
  Form,
  FormButton,
  FormLink,
  FormProfile,
  FormSection,
  FormToggle,
} from 'components/Form';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import { logout } from 'data/login';
import { userQuery } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useSettings } from 'data/settings';
import { useCredentialsStore } from 'data/credentials';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { t } from 'helpers/i18n';
import { isMockUser } from 'helpers/mock';
import {
  getServerWritesAllowed,
  setServerWritesAllowed,
  subscribeServerWrites,
} from 'helpers/serverWrites';
import { SettingsStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'Settings'>;

const Settings: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const { data: userInfo } = useQuery({ ...userQuery, enabled: loggedIn });
  const username = useCredentialsStore(state => state.credentials?.username);
  const serverWritesAllowed = useSyncExternalStore(
    subscribeServerWrites,
    getServerWritesAllowed,
  );
  const newChangelog = useSettings(
    settings => settings.lastShowChangelogVersion !== packageJson.version,
  );
  const courseInformationSharingBadgeShown = useSettings(
    settings => settings.courseInformationSharingBadgeShown,
  );

  const update = useAvailableUpdate();

  const handlePush = (name: Exclude<keyof SettingsStackParams, 'Settings'>) => {
    if (detailNavigator) {
      detailNavigator.replace(name, {
        disableAnimation: true,
      });
    } else {
      navigation.push(name);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logoutQuestion'),
      t('logoutConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: () => {
            void logout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeArea>
      <Form>
        <FormSection>
          <FormProfile
            name={userInfo?.name ?? username ?? 'learnX'}
            detail={userInfo?.department ?? undefined}
          />
          <FormButton
            testID="settings-logout"
            icon={{
              ios: 'rectangle.portrait.and.arrow.right',
              android: 'account-remove',
            }}
            title={t('logout')}
            destructive
            onPress={handleLogout}
          />
        </FormSection>
        <FormSection>
          <FormLink
            icon={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew' }}
            title={t('semesterSelection')}
            onPress={() => handlePush('SemesterSelection')}
          />
          <FormLink
            icon={{ ios: 'calendar', android: 'calendar-range' }}
            title={t('calendarsAndReminders')}
            onPress={() => handlePush('CalendarEvent')}
          />
          <FormLink
            icon={{ ios: 'folder', android: 'folder-cog' }}
            title={t('fileSettings')}
            onPress={() => handlePush('FileSettings')}
          />
          <FormLink
            testID="settings-notifications"
            icon={{ ios: 'bell', android: 'bell' }}
            title={t('notifications')}
            onPress={() => handlePush('NotificationSettings')}
          />
        </FormSection>
        <FormSection>
          <FormLink
            icon={{ ios: 'info.circle', android: 'information' }}
            badge={!courseInformationSharingBadgeShown}
            title={t('courseInformationSharing')}
            onPress={() => handlePush('CourseInformationSharing')}
          />
        </FormSection>
        <FormSection>
          <FormLink
            icon={{ ios: 'note.text', android: 'note-text' }}
            badge={newChangelog}
            title={t('changelog')}
            onPress={() => handlePush('Changelog')}
          />
          {update && (
            <FormLink
              icon={{ ios: 'arrow.down.circle', android: 'update' }}
              badge
              title={t('foundNewVersion', { version: update.version })}
              onPress={() => Linking.openURL(update.url)}
            />
          )}
          <FormLink
            icon={{ ios: 'hammer', android: 'dev-to' }}
            title={t('becomeMaintainer')}
            onPress={() => handlePush('Maintainer')}
          />
          <FormLink
            icon={{ ios: 'questionmark.circle', android: 'help' }}
            title={t('helpAndFeedback')}
            onPress={() => handlePush('Help')}
          />
          <FormLink
            icon={{ ios: 'c.circle', android: 'copyright' }}
            title={t('about')}
            onPress={() => handlePush('About')}
          />
        </FormSection>
        {__DEV__ && !isMockUser(username) && (
          // A dev-only switch for testing with a real account, so it is not translated.
          <FormSection footer="Debug builds don't submit assignments, share course information or sync favorites until this is on. Favorites changed meanwhile wait and are sent when it's turned on. It turns off again when the app reloads.">
            <FormToggle
              testID="settings-allow-server-writes"
              icon={{ ios: 'exclamationmark.shield', android: 'shield-alert' }}
              title="Allow Server Writes"
              value={serverWritesAllowed}
              onValueChange={setServerWritesAllowed}
            />
          </FormSection>
        )}
        {__DEV__ && isMockUser(username) && (
          <FormSection>
            <FormLink
              testID="settings-mock-network"
              icon={{ ios: 'network', android: 'network' }}
              title="Network Emulation"
              onPress={() => handlePush('MockNetwork')}
            />
          </FormSection>
        )}
      </Form>
    </SafeArea>
  );
};

export default Settings;
