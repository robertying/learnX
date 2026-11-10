import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Alert, Linking } from 'react-native';
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
import { useAppState } from 'data/appState';
import { useCredentialsStore } from 'data/credentials';
import { useShowDetail } from 'hooks/useDetailNavigator';
import { t } from 'helpers/i18n';
import { mockNetworkTitle } from 'navigation/options';
import { isMockUser } from 'helpers/mock';
import {
  getServerWritesAllowed,
  setServerWritesAllowed,
  subscribeServerWrites,
} from 'helpers/serverWrites';
import { findWhatsNew, releases, whatsNewContext } from 'helpers/whatsNew';
import { MainStackScreenProps, SettingsStackParams } from './types';

type Props = MainStackScreenProps<SettingsStackParams, 'Settings'>;

/**
 * The newest What's New this install has. Debug builds preview the newest
 * one with every row, since their version is usually behind it.
 */
const latestWhatsNew = () => {
  const found = findWhatsNew(whatsNewContext());
  if (found) {
    return { version: found.version };
  }
  return __DEV__ && releases[0]
    ? { version: releases[0].version, preview: true }
    : null;
};

const Settings: React.FC<Props> = ({ navigation }) => {
  const show = useShowDetail(navigation);

  const loggedIn = useLoggedIn();
  const { data: userInfo } = useQuery({ ...userQuery, enabled: loggedIn });
  const username = useCredentialsStore(state => state.credentials?.username);
  const serverWritesAllowed = useSyncExternalStore(
    subscribeServerWrites,
    getServerWritesAllowed,
  );
  const courseSharingSeen = useAppState(state => state.courseSharingSeen);

  const update = useAvailableUpdate();
  const whatsNew = latestWhatsNew();

  const handlePush = (name: Exclude<keyof SettingsStackParams, 'Settings'>) =>
    show(name);

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
            badge={!courseSharingSeen}
            title={t('courseInformationSharing')}
            onPress={() => handlePush('CourseInformationSharing')}
          />
        </FormSection>
        <FormSection>
          {whatsNew && (
            <FormLink
              testID="settings-whats-new"
              icon={{ ios: 'sparkles', android: 'creation-outline' }}
              title={t('whatsNew')}
              onPress={() =>
                navigation.navigate('WhatsNewStack', {
                  screen: 'WhatsNew',
                  params: whatsNew,
                })
              }
            />
          )}
          <FormLink
            icon={{ ios: 'note.text', android: 'note-text' }}
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
              title={mockNetworkTitle}
              onPress={() => handlePush('MockNetwork')}
            />
          </FormSection>
        )}
      </Form>
    </SafeArea>
  );
};

export default Settings;
