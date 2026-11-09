import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import semverGt from 'semver/functions/gt';
import SafeArea from 'components/SafeArea';
import {
  Form,
  FormButton,
  FormLink,
  FormProfile,
  FormSection,
} from 'components/Form';
import { getLatestRelease } from 'helpers/update';
import { logout } from 'data/login';
import { userQuery } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { setSetting, useSettings } from 'data/settings';
import { clearLoginCookies, dataSource } from 'data/source';
import { useCredentialsStore } from 'data/credentials';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { t } from 'helpers/i18n';
import { isMockUser } from 'helpers/mock';
import { SettingsStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'Settings'>;

const Settings: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const { data: userInfo } = useQuery({ ...userQuery, enabled: loggedIn });
  const username = useCredentialsStore(state => state.credentials?.username);
  const newChangelog = useSettings(
    settings => settings.lastShowChangelogVersion !== packageJson.version,
  );
  const courseInformationSharingBadgeShown = useSettings(
    settings => settings.courseInformationSharingBadgeShown,
  );

  const [update, setUpdate] = useState<{ version: string; url: string } | null>(
    null,
  );

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
            void dataSource.logout();
            void clearLoginCookies();
            void logout();
          },
        },
      ],
      { cancelable: true },
    );
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      getLatestRelease().then(
        ({ version, url }) => {
          if (semverGt(version, packageJson.version)) {
            setUpdate({
              version,
              url,
            });
            setSetting('newUpdate', true);
          }
        },
        // Offline or the mirror is down; the update row stays hidden.
        () => {},
      );
    }
  }, []);

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
        {__DEV__ && isMockUser(username) && (
          <FormSection>
            <FormLink
              testID="settings-mock-network"
              icon={{ ios: 'network', android: 'network' }}
              title="Network emulation"
              onPress={() => handlePush('MockNetwork')}
            />
          </FormSection>
        )}
      </Form>
    </SafeArea>
  );
};

export default Settings;
