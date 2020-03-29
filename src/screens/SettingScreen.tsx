import React, {useEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ListRenderItem,
  Platform,
  SafeAreaView,
  View,
  Text,
} from 'react-native';
import {
  Navigation,
  OptionsModalPresentationStyle,
} from 'react-native-navigation';
import fs from 'react-native-fs';
import {iOSColors, iOSUIKit} from 'react-native-typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useDispatch} from 'react-redux';
import packageConfig from '../../package.json';
import SettingListItem from '../components/SettingListItem';
import Colors from '../constants/Colors';
import {
  saveAssignmentsToCalendar,
  saveCoursesToCalendar,
  removeCalendars,
} from '../helpers/calendar';
import {getTranslation} from '../helpers/i18n';
import Snackbar from 'react-native-snackbar';
import {getLatestRelease} from '../helpers/update';
import {clearStore} from '../redux/actions/root';
import {setSetting} from '../redux/actions/settings';
import {INavigationScreen} from '../types';
import semverGt from 'semver/functions/gt';
import DeviceInfo from '../constants/DeviceInfo';
import {pushTo, setDetailView, getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import Modal from 'react-native-modal';
import {ActivityIndicator} from 'react-native-paper';
import TextButton from '../components/TextButton';
import {dataSource} from '../redux/dataSource';
import RNCalendarEvents from 'react-native-calendar-events';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import {fileDir} from '../helpers/share';
import {ISettingsState} from '../redux/types/state';
import dayjs from '../helpers/dayjs';

const SettingScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const settings = useTypedSelector((state) => state.settings);
  const assignments = useTypedSelector((state) => state.assignments.items);

  const navigate = (name: string) => {
    if (DeviceInfo.isIPad() && !settings.isCompact) {
      setDetailView(name, props.componentId);
    } else {
      pushTo(
        name,
        props.componentId,
        undefined,
        undefined,
        false,
        colorScheme === 'dark',
      );
    }
  };

  const onAcknowledgementsPress = () => {
    navigate('settings.acknowledgements');
  };

  const onLogoutPress = () => {
    Alert.alert(
      getTranslation('logout'),
      getTranslation('logoutConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: () => {
            dispatch(clearStore());
            Navigation.showModal({
              component: {
                id: 'login',
                name: 'login',
                options: {
                  modalPresentationStyle:
                    OptionsModalPresentationStyle.fullScreen,
                },
              },
            });
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onAboutPress = () => {
    navigate('settings.about');
  };

  const onHelpPress = () => {
    navigate('settings.help');
  };

  const [assignmentSyncing, setAssignmentSyncing] = useState(false);

  const onCalendarSyncSwitchChange = async (enabled: boolean) => {
    if (enabled) {
      const status = await RNCalendarEvents.authorizationStatus();
      if (status !== 'authorized') {
        const result = await RNCalendarEvents.authorizeEventStore();
        if (result !== 'authorized') {
          Snackbar.show({
            text: getTranslation('accessCalendarFailure'),
            duration: Snackbar.LENGTH_SHORT,
          });
          return;
        }
      }

      if (assignments) {
        setAssignmentSyncing(true);
        await saveAssignmentsToCalendar(assignments);
        setAssignmentSyncing(false);
      }
    }
    dispatch(setSetting('calendarSync', enabled));
  };

  const onCheckUpdatePress = async () => {
    const {version, url} = await getLatestRelease();

    if (semverGt(version, packageConfig.version)) {
      Alert.alert(
        getTranslation('checkUpdate'),
        `${getTranslation('foundNewVersion')} v${version}`,
        [
          {
            text: getTranslation('cancel'),
            style: 'cancel',
          },
          {
            text: getTranslation('update'),
            onPress: () => {
              Linking.openURL(url);
            },
          },
        ],
        {cancelable: true},
      );
      dispatch(setSetting('hasUpdate', true));
    } else {
      Snackbar.show({
        text: getTranslation('noUpdate'),
        duration: Snackbar.LENGTH_SHORT,
      });
      dispatch(setSetting('hasUpdate', false));
    }
  };

  const onClearFileCachePress = () => {
    Alert.alert(
      getTranslation('clearFileCache'),
      getTranslation('clearFileCacheConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: async () => {
            try {
              if (await fs.exists(fileDir)) {
                await fs.unlink(fileDir);
              }
              Snackbar.show({
                text: getTranslation('clearFileCacheSuccess'),
                duration: Snackbar.LENGTH_SHORT,
              });
            } catch {
              Snackbar.show({
                text: getTranslation('clearFileCacheFail'),
                duration: Snackbar.LENGTH_SHORT,
              });
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onDeleteCalendarsPress = () => {
    Alert.alert(
      getTranslation('deleteCalendars'),
      getTranslation('deleteCalendarsConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: async () => {
            await removeCalendars();
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onSemestersPress = () => {
    navigate('settings.semesters');
  };

  const [courseSyncModalVisible, setCourseSyncModalVisible] = useState(false);

  const handleCourseSync = async () => {
    const status = await RNCalendarEvents.authorizationStatus();
    if (status !== 'authorized') {
      const result = await RNCalendarEvents.authorizeEventStore();
      if (result !== 'authorized') {
        Snackbar.show({
          text: getTranslation('accessCalendarFailure'),
          duration: Snackbar.LENGTH_LONG,
        });
        return;
      }
    }

    setCourseSyncModalVisible(true);
  };

  const onSetting = (key: keyof ISettingsState, enabled: boolean) => {
    dispatch(setSetting(key, enabled));
  };

  useEffect(() => {
    if (courseSyncModalVisible) {
      (async () => {
        const today = dayjs();
        const monthFromToday = today.add(1, 'month');

        try {
          const events = await dataSource.getCalendar(
            today.format('YYYYMMDD'),
            monthFromToday.format('YYYYMMDD'),
            settings.graduate,
          );
          await saveCoursesToCalendar(events, today, monthFromToday);
          setCourseSyncModalVisible(false);
          await new Promise((r) => setTimeout(r, 1500));
          Snackbar.show({
            text: getTranslation('courseSyncSuccess'),
            duration: Snackbar.LENGTH_SHORT,
          });
        } catch {
          setCourseSyncModalVisible(false);
          await new Promise((r) => setTimeout(r, 1500));
          Snackbar.show({
            text: getTranslation('courseSyncFailure'),
            duration: Snackbar.LENGTH_SHORT,
          });
        }
      })();
    }
  }, [courseSyncModalVisible, settings.graduate]);

  const onPushNotificationPress = () => {
    navigate('settings.pushNotifications');
  };

  const renderListItem: ListRenderItem<{}> = ({index}) => {
    switch (index) {
      case 0:
        return (
          <SettingListItem
            containerStyle={{marginTop: 10}}
            variant="arrow"
            icon={
              <MaterialIcons
                name="notifications-active"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('pushNotifications')}
            onPress={onPushNotificationPress}
          />
        );
      case 1:
        return (
          <SettingListItem
            variant="switch"
            icon={
              <MaterialCommunityIcons
                name="calendar-alert"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            loading={assignmentSyncing}
            text={getTranslation('calendarSync')}
            switchValue={settings.calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        );
      case 2:
        return (
          <SettingListItem
            variant="none"
            icon={
              <MaterialCommunityIcons
                name="calendar-month"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('courseSync')}
            onPress={handleCourseSync}
          />
        );
      case 3:
        return (
          <SettingListItem
            variant="arrow"
            icon={
              <MaterialCommunityIcons
                name="book"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('changeSemester')}
            onPress={onSemestersPress}
          />
        );
      case 4:
        return (
          <SettingListItem
            variant="switch"
            icon={
              <MaterialCommunityIcons
                name="account-convert"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('graduate')}
            switchValue={settings.graduate}
            onSwitchValueChange={(e) => onSetting('graduate', e)}
          />
        );
      case 5:
        return (
          <SettingListItem
            variant="none"
            containerStyle={{marginTop: 16}}
            icon={
              <MaterialCommunityIcons
                name="account-off"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('logout')}
            onPress={onLogoutPress}
          />
        );
      case 6:
        return (
          <SettingListItem
            variant="none"
            icon={
              <MaterialCommunityIcons
                name="file-hidden"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('clearFileCache')}
            onPress={onClearFileCachePress}
          />
        );
      case 7:
        return (
          <SettingListItem
            variant="none"
            icon={
              <MaterialCommunityIcons
                name="calendar-remove"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('deleteCalendars')}
            onPress={onDeleteCalendarsPress}
          />
        );
      case 8:
        return Platform.OS === 'android' || DeviceInfo.isMac() ? (
          <SettingListItem
            variant="none"
            containerStyle={{marginTop: 16}}
            icon={
              settings.hasUpdate ? (
                <View>
                  <MaterialCommunityIcons
                    name="update"
                    size={20}
                    color={
                      colorScheme === 'dark'
                        ? Colors.system('gray', 'dark')
                        : undefined
                    }
                  />
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      backgroundColor: iOSColors.red,
                      borderRadius: 3,
                      width: 6,
                      height: 6,
                    }}
                  />
                </View>
              ) : (
                <MaterialCommunityIcons
                  name="update"
                  size={20}
                  color={
                    colorScheme === 'dark'
                      ? Colors.system('gray', 'dark')
                      : undefined
                  }
                />
              )
            }
            text={
              settings.hasUpdate
                ? getTranslation('foundNewVersion')
                : getTranslation('checkUpdate')
            }
            onPress={onCheckUpdatePress}
          />
        ) : null;
      case 9:
        return (
          <SettingListItem
            variant="arrow"
            containerStyle={{marginTop: 16}}
            icon={
              <MaterialCommunityIcons
                name="help"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('help')}
            onPress={onHelpPress}
          />
        );
      case 10:
        return (
          <SettingListItem
            variant="arrow"
            icon={
              <MaterialCommunityIcons
                name="tag-heart"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('acknowledgements')}
            onPress={onAcknowledgementsPress}
          />
        );
      case 11:
        return (
          <SettingListItem
            containerStyle={{marginBottom: 16}}
            variant="arrow"
            icon={
              <MaterialIcons
                name="copyright"
                size={20}
                color={
                  colorScheme === 'dark'
                    ? Colors.system('gray', 'dark')
                    : undefined
                }
              />
            }
            text={getTranslation('about')}
            onPress={onAboutPress}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  return (
    <SafeAreaView
      testID="SettingsScreen"
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <FlatList
        style={{backgroundColor: Colors.system('background', colorScheme)}}
        data={[
          {key: 'pushNotifications'},
          {key: 'calendarSync'},
          {key: 'courseSync'},
          {key: 'semesters'},
          {key: 'graduate'},
          {key: 'logout'},
          {key: 'clearFileCache'},
          {key: 'deleteCalendars'},
          {key: 'checkUpdate'},
          {key: 'help'},
          {key: 'acknowledgement'},
          {key: 'about'},
        ]}
        renderItem={renderListItem}
      />
      <Modal
        isVisible={courseSyncModalVisible}
        backdropColor={
          colorScheme === 'dark' ? 'rgba(255,255,255,0.25)' : undefined
        }
        animationIn="bounceIn"
        animationOut="zoomOut"
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}>
        <View
          style={{
            backgroundColor: Colors.system('background', colorScheme),
            width: '100%',
            height: 150,
            padding: 20,
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text
            style={[
              colorScheme === 'dark' ? iOSUIKit.bodyWhite : iOSUIKit.body,
              {textAlign: 'center'},
            ]}>
            {getTranslation('fetchingCourseSchedule')}
          </Text>
          <ActivityIndicator
            style={{margin: 20}}
            color={Colors.system('purple', colorScheme)}
            animating={true}
          />
          <TextButton
            textStyle={{color: Colors.system('purple', colorScheme)}}
            onPress={() => setCourseSyncModalVisible(false)}>
            {getTranslation('cancel')}
          </TextButton>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

SettingScreen.options = getScreenOptions(getTranslation('settings'));

export default SettingScreen;
