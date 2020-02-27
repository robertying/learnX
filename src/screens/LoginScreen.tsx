import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import AntDesign from 'react-native-vector-icons/AntDesign';
import RaisedButton from '../components/RaisedButton';
import TextField from '../components/TextField';
import Colors from '../constants/Colors';
import {dummyPassword, dummyUsername} from '../constants/Dummy';
import {getTranslation} from '../helpers/i18n';
import Snackbar from 'react-native-snackbar';
import {login} from '../redux/actions/auth';
import {setCurrentSemester} from '../redux/actions/currentSemester';
import {setMockStore} from '../redux/actions/root';
import {getAllSemesters} from '../redux/actions/semesters';
import {INavigationScreen} from '../types';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import {iOSUIKit} from 'react-native-typography';
import {useDispatch} from 'react-redux';
import {setSetting} from '../redux/actions/settings';

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
});

const LoginScreen: INavigationScreen = props => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const auth = useTypedSelector(state => state.auth);
  const semesters = useTypedSelector(state => state.semesters);
  const graduate = useTypedSelector(state => state.settings.graduate);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  useEffect(() => {
    if (auth.error) {
      Snackbar.show({
        text: getTranslation('loginFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
      setLoading(false);
    }
  }, [auth.error]);

  useEffect(() => {
    if (auth.loggedIn) {
      Snackbar.show({
        text: getTranslation('fetchingSemesters'),
        duration: Snackbar.LENGTH_SHORT,
      });
      dispatch(getAllSemesters());
    }
  }, [auth.loggedIn, dispatch]);

  useEffect(() => {
    if (auth.loggedIn && semesters.items.length !== 0) {
      setLoading(false);
      dispatch(setCurrentSemester(semesters.items[0]));
      Keyboard.dismiss();
      Navigation.dismissModal('login');
      (async () => {
        const navigationRoot = await getNavigationRoot();
        Navigation.setRoot(navigationRoot);
      })();
    }
  }, [auth.loggedIn, semesters.items, dispatch]);

  useEffect(() => {
    if (semesters.error) {
      Snackbar.show({
        text: getTranslation('networkError'),
        duration: Snackbar.LENGTH_SHORT,
      });
      setLoading(false);
    }
  }, [semesters.error]);

  const usernameTextFieldRef = useRef<TextInput>(null);
  const passwordTextFieldRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [logoSize, setLogoSize] = useState(160);

  const onLogoPress = () => {
    if (logoSize >= 200) {
      LayoutAnimation.spring();
      setLogoSize(160);
    } else {
      LayoutAnimation.spring();
      setLogoSize(oldSize => oldSize + 10);
    }
  };

  const handleKeyboardNext = () =>
    passwordTextFieldRef.current &&
    (passwordTextFieldRef.current as any).getNode().focus();

  const handleUsernameChange = (text: string) => setUsername(text);

  const handlePasswordChange = (text: string) => setPassword(text);

  const onLoginButtonPress = () => {
    Keyboard.dismiss();

    if (username && password) {
      setLoading(true);
      if (username === dummyUsername && password === dummyPassword) {
        dispatch(setMockStore());
        return;
      }
      dispatch(login(username, password));
    } else {
      Snackbar.show({
        text: getTranslation('completeCredentials'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  };

  return (
    <SafeAreaView
      testID="LoginScreen"
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
        <TouchableWithoutFeedback onPress={onLogoPress}>
          {colorScheme === 'dark' ? (
            <Text
              style={{
                fontSize: logoSize,
                color: Colors.system('foreground', colorScheme),
              }}>
              X
            </Text>
          ) : (
            <Image
              style={{height: logoSize, width: logoSize}}
              source={require('../assets/images/MaskedAppIcon.png')}
            />
          )}
        </TouchableWithoutFeedback>
        <View
          style={{
            marginTop: 30,
            marginBottom: 30,
            alignItems: 'center',
          }}>
          <TextField
            testID="UsernameTextField"
            icon={
              <AntDesign
                name="user"
                size={25}
                color={Colors.system('purple', colorScheme)}
              />
            }
            tintColor={Colors.system('purple', colorScheme)}
            textContentType="username"
            returnKeyType="next"
            placeholder={getTranslation('username')}
            placeholderTextColor={Colors.system('purple', colorScheme)}
            onSubmitEditing={handleKeyboardNext}
            ref={usernameTextFieldRef}
            value={username}
            onChangeText={handleUsernameChange}
          />
          <TextField
            testID="PasswordTextField"
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
            <Switch
              value={graduate}
              onValueChange={value => dispatch(setSetting('graduate', value))}
            />
            <Text
              style={{
                color: Colors.system('purple', colorScheme),
                marginLeft: 8,
              }}>
              {getTranslation('graduate')}
            </Text>
          </View>
          <RaisedButton
            testID="LoginButton"
            disabled={loading}
            style={{
              backgroundColor: Colors.system('purple', colorScheme),
              width: 100,
              height: 40,
              marginTop: 30,
            }}
            textStyle={{color: 'white'}}
            onPress={onLoginButtonPress}>
            {getTranslation('login')}
          </RaisedButton>
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
          {getTranslation('credentialNote')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
