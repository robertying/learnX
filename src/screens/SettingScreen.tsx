import React, {useEffect} from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  View,
  ScrollView,
} from 'react-native';
import {
  Navigation,
  OptionsModalPresentationStyle,
} from 'react-native-navigation';
import fs from 'react-native-fs';
import {iOSColors} from 'react-native-typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useDispatch} from 'react-redux';
import packageConfig from '../../package.json';
import SettingListItem from '../components/SettingListItem';
import Colors from '../constants/Colors';
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
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import {fileDir} from '../helpers/fs';
import {ISettingsState} from '../redux/types/state';

const SettingScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const settings = useTypedSelector((state) => state.settings);

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

  const onLogoutPress = () => {
    if (settings.pushNotifications.enabled) {
      Snackbar.show({
        text: getTranslation('disablePushNotifications'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }

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
        duration: Snackbar.LENGTH_LONG,
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
                duration: Snackbar.LENGTH_LONG,
              });
            } catch {
              Snackbar.show({
                text: getTranslation('clearFileCacheFail'),
                duration: Snackbar.LENGTH_LONG,
              });
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onSetting = (key: keyof ISettingsState, enabled: boolean) => {
    dispatch(setSetting(key, enabled));
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
      <ScrollView>
        <SettingListItem
          containerStyle={{marginTop: 8}}
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
          onPress={() => navigate('settings.pushNotifications')}
        />
        <SettingListItem
          variant="arrow"
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
          text={getTranslation('calendarReminders')}
          onPress={() => navigate('settings.calendar')}
        />
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
          onPress={() => navigate('settings.semesters')}
        />
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
        {Platform.OS === 'android' && (
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
        )}
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
          onPress={() => navigate('settings.help')}
        />
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
          onPress={() => navigate('settings.acknowledgements')}
        />
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
          onPress={() => navigate('settings.about')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

SettingScreen.options = getScreenOptions(getTranslation('settings'));

export default SettingScreen;
