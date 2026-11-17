import { useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';
import {
  Form,
  FormButton,
  FormLink,
  FormProfile,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { setSetting, useSettings } from 'data/settings';
import DeviceInfo from 'constants/DeviceInfo';
import { isElectron } from 'helpers/platform';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import useUpdateInstaller from 'hooks/useUpdateInstaller';
import useLoginItem from 'hooks/useLoginItem';
import useSandboxNote from 'hooks/useSandboxNote';
import { logout } from 'data/login';
import { userQuery } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useAppState } from 'data/appState';
import { useCredentialsStore } from 'data/credentials';
import {
  sameDetailRoot,
  useDetailRoot,
  useShowDetail,
} from 'hooks/useDetailNavigator';
import { calendarSettingsTitle } from 'helpers/calendar/details';
import { t } from 'helpers/i18n';
import { findWhatsNew, releases, whatsNewContext } from 'helpers/whatsNew';
import {
  MainStackScreenProps,
  SettingDetailParams,
  SettingsStackParams,
} from 'navigation/types';

type Props = MainStackScreenProps<SettingsStackParams, 'Settings'>;

/**
 * The newest What's New this install has. Debug builds preview the newest
 * one with every row of this platform, since their version is usually
 * behind it.
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
  // A row opens its page beside Settings where there's a detail pane, and
  // shows as selected while it's open there.
  const detailRoot = useDetailRoot();
  const linkTo = (name: keyof SettingDetailParams) => ({
    onPress: () => show(name),
    opened: sameDetailRoot(detailRoot, { name }),
  });
  const graduate = useSettings(settings => settings.graduate);

  const loggedIn = useLoggedIn();
  const { data: userInfo } = useQuery({ ...userQuery, enabled: loggedIn });
  const username = useCredentialsStore(state => state.credentials?.username);
  const courseSharingSeen = useAppState(state => state.courseSharingSeen);

  const update = useAvailableUpdate();
  const installer = useUpdateInstaller(update, {
    onViewChangelog: () => show('Changelog'),
  });
  const whatsNew = latestWhatsNew();
  // Electron on Windows (and a Mac dev run): off until the user turns it on.
  const loginItem = useLoginItem();
  const sandboxNote = useSandboxNote();

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
    <FormScreen>
      <Form testID="settings-list">
        {/* On top, where an update is seen first; only the APKs show it. */}
        {update && (
          <FormSection>
            <FormLink
              icon="update"
              testID="settings-update"
              badge={!installer.step}
              title={t('foundNewVersion', { version: update.version })}
              subtitle={
                installer.step === 'downloading'
                  ? t('updateDownloading', {
                      percent: Math.round(installer.progress * 100),
                    })
                  : installer.step === 'installing'
                    ? t('updateInstalling')
                    : undefined
              }
              progress={
                installer.step === 'downloading'
                  ? installer.progress
                  : undefined
              }
              onPress={installer.update}
            />
          </FormSection>
        )}
        <FormSection>
          <FormProfile
            name={userInfo?.name ?? username ?? 'learnX'}
            detail={userInfo?.department ?? undefined}
          />
          {/* Which timetable Today, Schedule and the calendar show. */}
          <FormToggle
            icon="graduate"
            testID="settings-graduate"
            title={t('graduate')}
            value={graduate}
            onValueChange={value => setSetting('graduate', value)}
          />
          <FormButton
            testID="settings-logout"
            icon="logout"
            title={t('logoutEllipsis')}
            onPress={handleLogout}
          />
        </FormSection>
        <FormSection>
          <FormLink
            icon="semester"
            testID="settings-semester"
            title={t('semesterSelection')}
            {...linkTo('SemesterSelection')}
          />
          <FormLink
            testID="settings-notifications"
            icon="notifications"
            title={t('notifications')}
            {...linkTo('NotificationSettings')}
          />
          <FormLink
            icon="calendar"
            testID="settings-calendar"
            title={calendarSettingsTitle()}
            {...linkTo('CalendarSettings')}
          />
          <FormLink
            icon="download"
            testID="settings-downloads"
            title={t('downloads')}
            {...linkTo('Downloads')}
          />
          {/* The Mac and Windows have no swipe: their cards' actions are in a
              right-click menu. */}
          {!DeviceInfo.isMac() && !isElectron() && (
            <FormLink
              testID="settings-swipe-actions"
              icon="swipe"
              title={t('swipeActions')}
              {...linkTo('SwipeActions')}
            />
          )}
        </FormSection>
        {loginItem && (
          <FormSection footer={t('startAtLoginCaption')}>
            <FormToggle
              icon="open"
              testID="settings-start-at-login"
              title={t('startAtLogin')}
              value={loginItem.enabled}
              onValueChange={value => {
                void loginItem.set(value);
              }}
            />
          </FormSection>
        )}
        <FormSection>
          <FormLink
            icon="info"
            badge={!courseSharingSeen}
            testID="settings-course-sharing"
            title={t('courseInformationSharing')}
            {...linkTo('CourseInformationSharing')}
          />
        </FormSection>
        <FormSection footer={sandboxNote ?? undefined}>
          {whatsNew && (
            <FormLink
              testID="settings-whats-new"
              icon="whatsNew"
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
            icon="changelog"
            testID="settings-changelog"
            title={t('changelog')}
            {...linkTo('Changelog')}
          />
          <FormLink
            icon="maintainer"
            testID="settings-maintainer"
            title={t('becomeMaintainer')}
            {...linkTo('Maintainer')}
          />
          <FormLink
            icon="help"
            testID="settings-help"
            title={t('helpAndFeedback')}
            {...linkTo('Help')}
          />
          <FormLink
            icon="about"
            testID="settings-about"
            title={t('about')}
            {...linkTo('About')}
          />
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default Settings;
