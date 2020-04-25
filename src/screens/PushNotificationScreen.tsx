import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  Linking,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {useDispatch} from 'react-redux';
import * as Notifications from 'expo-notifications';
import {iOSUIKit} from 'react-native-typography';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {getScreenOptions, pushTo} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import RaisedButton from '../components/RaisedButton';
import SettingListItem from '../components/SettingListItem';
import {Navigation} from 'react-native-navigation';
import {setSetting} from '../redux/actions/settings';
import Snackbar from 'react-native-snackbar';
import {
  serviceUrl,
  requestNotificationPermission,
} from '../helpers/notification';

const styles = StyleSheet.create({
  sectionTitle: {
    margin: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  button: {
    width: '100%',
    height: 40,
    alignSelf: 'center',
    borderRadius: 0,
  },
  note: {
    margin: 6,
    marginHorizontal: 24,
  },
});

const PushNotificationScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

  const auth = useTypedSelector((state) => state.auth);
  const hiddenCourses = useTypedSelector((state) => state.courses.hidden);
  const settings = useTypedSelector((state) => state.settings);
  const pushNotificationsSettings = settings.pushNotifications;
  const firebaseAuth = useTypedSelector((state) => state.auth.firebase);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const {status} = await Notifications.getPermissionsAsync();
      if (status) {
        setPermissionGranted(true);
      }
    })();
  }, []);

  const handlePermissions = async () => {
    if (await requestNotificationPermission()) {
      setPermissionGranted(true);
    }
  };

  const handleAgreement = () => {
    pushTo(
      'settings.pushNotifications.agreement',
      props.componentId,
      undefined,
      undefined,
      false,
      colorScheme === 'dark',
    );
  };

  const handleFirebase = async () => {
    if (
      !pushNotificationsSettings.agreementAcknowledged ||
      !permissionGranted
    ) {
      Snackbar.show({
        text: getTranslation('firebasePrerequisites'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }

    Navigation.showModal({
      component: {
        name: 'settings.pushNotifications.firebase',
      },
    });
  };

  const [enableLoading, setEnableLoading] = useState(false);

  const handlePushNotificationEnable = async (enabled: boolean) => {
    let deviceToken = null;

    if (enabled) {
      try {
        const token = await Notifications.getDevicePushTokenAsync();
        deviceToken = token.data;
        dispatch(
          setSetting('pushNotifications', {
            ...settings.pushNotifications,
            deviceToken: token.data,
          }),
        );
      } catch {
        if (Platform.OS === 'android') {
          Snackbar.show({
            text: getTranslation('googleServicesFail'),
            duration: Snackbar.LENGTH_LONG,
          });
        } else {
          Snackbar.show({
            text: getTranslation('deviceTokenFailure'),
            duration: Snackbar.LENGTH_LONG,
          });
        }
        return;
      }
    }

    if (!deviceToken && enabled) {
      Snackbar.show({
        text: getTranslation('deviceTokenFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }

    try {
      setEnableLoading(true);

      let response = await fetch(`${serviceUrl}/users/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: firebaseAuth?.refreshToken,
        }),
      });
      const result = await response.json();
      const idToken = result.id_token;

      if (enabled) {
        response = await fetch(`${serviceUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + idToken,
          },
          body: JSON.stringify({
            username: auth.username,
            password: auth.password,
            hiddenCourses: pushNotificationsSettings.includeHiddenCourses
              ? []
              : hiddenCourses,
          }),
        });

        if (!response.ok) {
          throw new Error();
        }

        response = await fetch(`${serviceUrl}/users/device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + idToken,
          },
          body: JSON.stringify({
            uuid: DeviceInfo.getUniqueId(),
            token: deviceToken,
            sandbox: __DEV__ ? 'true' : 'false',
            os: Platform.OS,
          }),
        });

        if (response.ok) {
          dispatch(
            setSetting('pushNotifications', {
              ...pushNotificationsSettings,
              enabled,
            }),
          );
        } else {
          throw new Error();
        }
      } else {
        response = await fetch(`${serviceUrl}/users/device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + idToken,
          },
          body: JSON.stringify({
            uuid: DeviceInfo.getUniqueId(),
            token: '',
            os: Platform.OS,
          }),
        });

        if (response.ok) {
          dispatch(
            setSetting('pushNotifications', {
              ...pushNotificationsSettings,
              enabled,
            }),
          );
        } else {
          throw new Error();
        }
      }
    } catch (error) {
      Snackbar.show({
        text: getTranslation('pushNotificationEnableFailure'),
        duration: Snackbar.LENGTH_LONG,
      });
    } finally {
      setEnableLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <ScrollView>
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
            styles.sectionTitle,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('pushNotificationPermissions')}
        </Text>
        <RaisedButton
          disabled={permissionGranted}
          style={[
            styles.button,
            {
              backgroundColor: permissionGranted
                ? Colors.system('gray', colorScheme)
                : Colors.system('purple', colorScheme),
            },
          ]}
          textStyle={{color: Colors.system('background', colorScheme)}}
          onPress={handlePermissions}>
          {permissionGranted
            ? getTranslation('granted')
            : getTranslation('grantPermissions')}
        </RaisedButton>
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
            styles.sectionTitle,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('agreement')}
        </Text>
        <RaisedButton
          style={[
            styles.button,
            {
              backgroundColor: pushNotificationsSettings.agreementAcknowledged
                ? Colors.system('gray', colorScheme)
                : Colors.system('purple', colorScheme),
            },
          ]}
          textStyle={{color: Colors.system('background', colorScheme)}}
          onPress={handleAgreement}>
          {pushNotificationsSettings.agreementAcknowledged
            ? getTranslation('acknowledged')
            : getTranslation('readAgreement')}
        </RaisedButton>
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
            styles.sectionTitle,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('accountManagement')}
        </Text>
        <SettingListItem
          icon={
            <MaterialIcons
              name="account"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          variant="none"
          text={
            firebaseAuth
              ? getTranslation('tapToReLogin')
              : getTranslation('loginRegister')
          }
          secondaryText={firebaseAuth?.email}
          onPress={handleFirebase}
        />
        <Text
          style={[
            colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
            styles.sectionTitle,
            {color: Colors.system('gray', colorScheme)},
          ]}>
          {getTranslation('pushNotificationStatus')}
        </Text>
        <SettingListItem
          icon={
            <MaterialIcons
              name="sync"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          }
          variant="switch"
          text={getTranslation('enabled')}
          loading={enableLoading}
          switchDisabled={
            !firebaseAuth ||
            !permissionGranted ||
            !pushNotificationsSettings.agreementAcknowledged
          }
          switchValue={pushNotificationsSettings.enabled}
          onSwitchValueChange={(enabled) =>
            handlePushNotificationEnable(enabled)
          }
        />
        <SettingListItem
          variant="switch"
          text={getTranslation('includeHiddenCourses')}
          switchValue={pushNotificationsSettings.includeHiddenCourses}
          onSwitchValueChange={(enabled) =>
            dispatch(
              setSetting('pushNotifications', {
                ...pushNotificationsSettings,
                includeHiddenCourses: enabled,
              }),
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

PushNotificationScreen.options = getScreenOptions(
  getTranslation('pushNotifications'),
);

export default PushNotificationScreen;
