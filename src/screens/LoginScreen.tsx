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
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {connect} from 'react-redux';
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
import {IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

interface ILoginScreenProps {
  loggedIn: boolean;
  loginError?: Error | null;
  semesters: string[];
  getAllSemestersError?: Error | null;
  login: (username: string, password: string) => void;
  setMockStore: () => void;
  setCurrentSemester: (semesterId: string) => void;
  getAllSemesters: () => void;
}

const LoginScreen: INavigationScreen<ILoginScreenProps> = props => {
  const {
    loggedIn,
    semesters,
    login,
    loginError,
    setMockStore,
    setCurrentSemester,
    getAllSemesters,
    getAllSemestersError,
  } = props;

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const [loginButtonPressed, setLoginButtonPressed] = useState(false);

  useEffect(() => {
    if (loginButtonPressed && loginError) {
      Snackbar.show({
        text: getTranslation('loginFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
      setLoginButtonPressed(false);
    }
  }, [loginButtonPressed, loginError]);

  useEffect(() => {
    if (loggedIn) {
      Snackbar.show({
        text: getTranslation('fetchingSemesters'),
        duration: Snackbar.LENGTH_SHORT,
      });
      getAllSemesters();
    }
  }, [getAllSemesters, loggedIn]);

  useEffect(() => {
    if (loggedIn && semesters.length !== 0) {
      setCurrentSemester(semesters[0]);
      Keyboard.dismiss();
      Navigation.dismissModal('login');
      (async () => {
        const navigationRoot = await getNavigationRoot();
        Navigation.setRoot(navigationRoot);
      })();
    }
  }, [loggedIn, semesters, semesters.length, setCurrentSemester]);

  useEffect(() => {
    if (getAllSemestersError) {
      Snackbar.show({
        text: getTranslation('networkError'),
        duration: Snackbar.LENGTH_SHORT,
      });
      setLoginButtonPressed(false);
    }
  }, [getAllSemestersError]);

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

  const handleDummyUser = (username: string, password: string) => {
    if (username === dummyUsername && password === dummyPassword) {
      setMockStore();
      return;
    }
  };

  const onLoginButtonPress = () => {
    Keyboard.dismiss();
    setLoginButtonPressed(true);

    if (username && password) {
      handleDummyUser(username, password);
      login(username, password);
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
          <RaisedButton
            testID="LoginButton"
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const mapStateToProps = (state: IPersistAppState) => ({
  loggedIn: state.auth.loggedIn,
  loginError: state.auth.error,
  semesters: state.semesters.items,
  getAllSemestersError: state.semesters.error,
});

const mapDispatchToProps = {
  login,
  setMockStore,
  setCurrentSemester,
  getAllSemesters,
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginScreen);
