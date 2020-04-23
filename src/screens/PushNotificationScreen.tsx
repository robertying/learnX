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
import {messaging} from '../helpers/notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
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
import {serviceUrl} from '../helpers/notification';
import PushNotification from 'react-native-push-notification';

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
});

const PushNotificationScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

  const auth = useTypedSelector((state) => state.auth);
  const settings = useTypedSelector((state) => state.settings);
  const pushNotificationsSettings = settings.pushNotifications;
  const firebaseAuth = useTypedSelector((state) => state.auth.firebase);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.checkPermissions((permissions) => {
          if (permissions.alert || permissions.badge || permissions.sound) {
            setPermissionGranted(true);
          } else {
            setPermissionGranted(false);
          }
        });
      } else {
        PushNotification.checkPermissions((permissions) => {
          if (permissions.alert) {
            setPermissionGranted(true);
          } else {
            setPermissionGranted(false);
          }
        });
      }
    })();
  }, []);

  const handlePermissions = async () => {
    if (Platform.OS === 'ios') {
      const results = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });

      if (results.alert || results.badge || results.sound) {
        setPermissionGranted(true);
      } else {
        setPermissionGranted(false);
        Linking.openSettings();
      }
    } else {
      PushNotification.checkPermissions((permissions) => {
        if (!permissions.alert) {
          Snackbar.show({
            text: getTranslation('pushNotificationReminder'),
            duration: Snackbar.LENGTH_SHORT,
          });
        }
      });
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
        duration: Snackbar.LENGTH_SHORT,
      });
      return;
    }

    if (Platform.OS === 'android') {
      try {
        const token = await messaging().getToken();
        dispatch(
          setSetting('pushNotifications', {
            ...settings.pushNotifications,
            deviceToken: token,
          }),
        );
      } catch {
        Snackbar.show({
          text: getTranslation('googleServicesFail'),
          duration: Snackbar.LENGTH_SHORT,
        });
        return;
      }
    }

    Navigation.showModal({
      component: {
        name: 'settings.pushNotifications.firebase',
      },
    });
  };

  const [enableLoading, setEnableLoading] = useState(false);

  const handlePushNotificationEnable = async (enabled: boolean) => {
    if (!pushNotificationsSettings.deviceToken) {
      Snackbar.show({
        text: getTranslation('deviceTokenFailure'),
        duration: Snackbar.LENGTH_SHORT,
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
            token: pushNotificationsSettings.deviceToken,
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
        duration: Snackbar.LENGTH_SHORT,
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
      </ScrollView>
    </SafeAreaView>
  );
};

PushNotificationScreen.options = getScreenOptions(
  getTranslation('pushNotifications'),
);

export default PushNotificationScreen;
