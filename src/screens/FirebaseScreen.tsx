import React, {useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TextInput,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {iOSUIKit} from 'react-native-typography';
import {useDispatch} from 'react-redux';
import {useColorScheme} from 'react-native-appearance';
import Snackbar from 'react-native-snackbar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RaisedButton from '../components/RaisedButton';
import TextField from '../components/TextField';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {setFirebaseAuth} from '../redux/actions/auth';
import {INavigationScreen} from '../types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import TextButton from '../components/TextButton';
import {serviceUrl} from '../helpers/notification';
import {useTypedSelector} from '../redux/store';

const styles = StyleSheet.create({
  note: {
    alignSelf: 'center',
    textAlign: 'center',
    fontStyle: 'italic',
    width: '60%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  button: {
    width: 100,
    height: 40,
    margin: 8,
  },
});

const FirebaseScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const pushNotificationsSettings = useTypedSelector(
    (state) => state.settings.pushNotifications,
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const emailTextFieldRef = useRef<TextInput>(null);
  const passwordTextFieldRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleKeyboardNext = () => passwordTextFieldRef.current?.focus();

  const handleEmailChange = (text: string) => setEmail(text);

  const handlePasswordChange = (text: string) => setPassword(text);

  const onLoginButtonPress = async () => {
    Keyboard.dismiss();

    if (email && password) {
      setLoading(true);

      try {
        const response = await fetch(`${serviceUrl}/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        });
        const result = await response.json();

        if (!result.emailVerified) {
          Snackbar.show({
            text: getTranslation('verifyEmail'),
            duration: Snackbar.LENGTH_LONG,
            action: {
              text: getTranslation('resend'),
              onPress: async () => {
                try {
                  await fetch(`${serviceUrl}/users/verify`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      email,
                      password,
                    }),
                  });
                  Snackbar.show({
                    text: getTranslation('verificationEmailSent'),
                    duration: Snackbar.LENGTH_LONG,
                  });
                } catch {
                  Snackbar.show({
                    text: getTranslation('networkError'),
                    duration: Snackbar.LENGTH_LONG,
                  });
                }
              },
            },
          });
          return;
        }

        dispatch(setFirebaseAuth(result));
        Navigation.dismissModal(props.componentId);
        Snackbar.show({
          text: getTranslation('firebaseLoginSuccess'),
          duration: Snackbar.LENGTH_LONG,
        });
      } catch {
        Snackbar.show({
          text: getTranslation('firebaseLoginFailure'),
          duration: Snackbar.LENGTH_LONG,
        });
      } finally {
        setLoading(false);
      }
    } else {
      Snackbar.show({
        text: getTranslation('firebaseCompleteCredentials'),
        duration: Snackbar.LENGTH_LONG,
      });
    }
  };

  const onRegisterButtonPress = async () => {
    Keyboard.dismiss();

    if (email && password) {
      if (password.length < 6) {
        Snackbar.show({
          text: getTranslation('passwordMinimalLength'),
          duration: Snackbar.LENGTH_LONG,
        });
        return;
      }
      setLoading(true);

      try {
        const response = await fetch(`${serviceUrl}/users/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        });
        await response.json();

        Snackbar.show({
          text: getTranslation('firebaseRegisterSuccess'),
          duration: Snackbar.LENGTH_LONG,
        });
      } catch {
        Snackbar.show({
          text: getTranslation('firebaseRegisterFailure'),
          duration: Snackbar.LENGTH_LONG,
        });
      } finally {
        setLoading(false);
      }
    } else {
      Snackbar.show({
        text: getTranslation('firebaseCompleteCredentials'),
        duration: Snackbar.LENGTH_LONG,
      });
    }
  };

  const handlePasswordReset = async () => {
    Keyboard.dismiss();

    if (!email) {
      Snackbar.show({
        text: getTranslation('firebaseNoEmail'),
        duration: Snackbar.LENGTH_LONG,
      });
      return;
    }

    setLoading(true);

    try {
      await fetch(`${serviceUrl}/users/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      Snackbar.show({
        text: getTranslation('resetEmailSent'),
        duration: Snackbar.LENGTH_LONG,
      });
    } catch {
      Snackbar.show({
        text: getTranslation('networkError'),
        duration: Snackbar.LENGTH_LONG,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (pushNotificationsSettings.enabled) {
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
            dispatch(setFirebaseAuth(undefined));
            Snackbar.show({
              text: getTranslation('logoutSuccess'),
              duration: Snackbar.LENGTH_LONG,
            });
          },
        },
      ],
      {cancelable: true},
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            alignItems: 'center',
          }}>
          <TextField
            icon={
              <Icon
                name="account"
                size={25}
                color={Colors.system('purple', colorScheme)}
              />
            }
            tintColor={Colors.system('purple', colorScheme)}
            textContentType="emailAddress"
            returnKeyType="next"
            placeholder={getTranslation('email')}
            placeholderTextColor={Colors.system('purple', colorScheme)}
            onSubmitEditing={handleKeyboardNext}
            ref={emailTextFieldRef}
            value={email}
            onChangeText={handleEmailChange}
          />
          <TextField
            containerStyle={{marginTop: 20}}
            icon={
              <Icon
                name="lastpass"
                size={25}
                color={Colors.system('purple', colorScheme)}
              />
            }
            tintColor={Colors.system('purple', colorScheme)}
            textContentType="password"
            secureTextEntry={true}
            returnKeyType="done"
            placeholder={getTranslation('password')}
            placeholderTextColor={Colors.system('purple', colorScheme)}
            ref={passwordTextFieldRef}
            value={password}
            onChangeText={handlePasswordChange}
          />
          <View style={[styles.row, {marginTop: 30}]}>
            <RaisedButton
              disabled={loading}
              style={[
                {
                  backgroundColor: Colors.system('purple', colorScheme),
                },
                styles.button,
              ]}
              textStyle={{color: 'white'}}
              onPress={onRegisterButtonPress}>
              {getTranslation('register')}
            </RaisedButton>
            <RaisedButton
              disabled={loading}
              style={[
                {
                  backgroundColor: Colors.system('purple', colorScheme),
                },
                styles.button,
              ]}
              textStyle={{color: 'white'}}
              onPress={onLoginButtonPress}>
              {getTranslation('login')}
            </RaisedButton>
          </View>
          <TextButton
            style={{flex: 0, margin: 10}}
            textStyle={{color: Colors.system('purple')}}
            onPress={handlePasswordReset}>
            {getTranslation('resetPassword')}
          </TextButton>
          <TextButton
            style={{flex: 0, margin: 10}}
            textStyle={{color: Colors.system('purple')}}
            onPress={handleLogout}>
            {getTranslation('logout')}
          </TextButton>
          <ActivityIndicator
            style={{margin: 10}}
            animating={loading}
            color={Platform.OS === 'android' ? Colors.theme : undefined}
          />
        </View>
        <Text
          style={[
            iOSUIKit.footnote,
            styles.note,
            {
              color: Colors.system('gray', colorScheme),
            },
          ]}>
          {getTranslation('firebaseNote')}
        </Text>
      </KeyboardAvoidingView>
      <TextButton
        textStyle={{color: Colors.system('purple', colorScheme)}}
        style={{margin: 16, position: 'absolute'}}
        onPress={() => Navigation.dismissModal(props.componentId)}>
        {getTranslation('cancel')}
      </TextButton>
    </SafeAreaView>
  );
};

export default FirebaseScreen;
