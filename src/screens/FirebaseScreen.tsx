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
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {iOSUIKit} from 'react-native-typography';
import {useDispatch} from 'react-redux';
import {useColorScheme} from 'react-native-appearance';
import Snackbar from 'react-native-snackbar';
import AntDesign from 'react-native-vector-icons/AntDesign';
import RaisedButton from '../components/RaisedButton';
import TextField from '../components/TextField';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {setFirebaseAuth} from '../redux/actions/auth';
import {INavigationScreen} from '../types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import TextButton from '../components/TextButton';

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

const FirebaseScreen: INavigationScreen = props => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

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
        const response = await fetch(
          'https://asia-northeast1-learnx-513c0.cloudfunctions.net/users/login',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          },
        );
        const result = await response.json();

        dispatch(setFirebaseAuth(result));
        Navigation.dismissModal(props.componentId);
      } catch {
        Snackbar.show({
          text: getTranslation('firebaseLoginFailure'),
          duration: Snackbar.LENGTH_SHORT,
        });
      } finally {
        setLoading(false);
      }
    } else {
      Snackbar.show({
        text: getTranslation('firebaseCompleteCredentials'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  };

  const onRegisterButtonPress = async () => {
    Keyboard.dismiss();

    if (email && password) {
      if (password.length < 6) {
        Snackbar.show({
          text: getTranslation('passwordMinimalLength'),
          duration: Snackbar.LENGTH_SHORT,
        });
        return;
      }
      setLoading(true);

      try {
        const response = await fetch(
          'https://asia-northeast1-learnx-513c0.cloudfunctions.net/users/signup',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          },
        );
        const result = await response.json();

        dispatch(setFirebaseAuth(result));
        Navigation.dismissModal(props.componentId);
      } catch {
        Snackbar.show({
          text: getTranslation('firebaseRegisterFailure'),
          duration: Snackbar.LENGTH_SHORT,
        });
      } finally {
        setLoading(false);
      }
    } else {
      Snackbar.show({
        text: getTranslation('firebaseCompleteCredentials'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
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
              <AntDesign
                name="user"
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
              <AntDesign
                name="key"
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
          <ActivityIndicator style={{margin: 10}} animating={loading} />
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
