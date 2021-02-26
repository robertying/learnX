import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Caption,
  Switch,
  TextInput,
  useTheme,
  Text,
} from 'react-native-paper';
import {StackScreenProps} from '@react-navigation/stack';
import {useDispatch} from 'react-redux';
import {FailReason} from 'thu-learn-lib-no-native/lib/types';
import useToast from 'hooks/useToast';
import {useTypedSelector} from 'data/store';
import {login} from 'data/actions/auth';
import {setSetting} from 'data/actions/settings';
import Styles from 'constants/Styles';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';
import env from 'helpers/env';
import {setMockStore} from 'data/actions/root';

const Login: React.FC<StackScreenProps<ScreenParams, 'Login'>> = () => {
  const theme = useTheme();

  const toast = useToast();

  const dispatch = useDispatch();
  const loggingIn = useTypedSelector((state) => state.auth.loggingIn);
  const error = useTypedSelector((state) => state.auth.error);
  const graduate = useTypedSelector((state) => state.settings.graduate);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordTextInputRef = useRef<any>(null);

  const handleNext = () => {
    passwordTextInputRef.current?.focus();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!username) {
      toast('请输入用户名或学号', 'error');
      return;
    }

    if (!password) {
      toast('请输入密码', 'error');
      return;
    }

    setLoading(true);

    if (username === env.DUMMY_USERNAME && password === env.DUMMY_PASSWORD) {
      dispatch(setMockStore());
    } else {
      dispatch(login(username, password));
    }
  };

  useEffect(() => {
    (async () => {
      if (loading && error && !loggingIn) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (error?.reason === FailReason.BAD_CREDENTIAL) {
          toast('账号或密码错误', 'error');
        } else {
          toast('未知错误：' + error?.reason, 'error');
        }
        setLoading(false);
      }
    })();
  }, [error, loading, loggingIn, toast]);

  return (
    <SafeArea>
      <ScrollView style={Styles.flex1} contentContainerStyle={styles.root}>
        <KeyboardAvoidingView
          style={styles.inputs}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Image
            style={styles.logo}
            source={
              theme.dark
                ? require('../../ios/learnX/Assets.xcassets/MaskedAppIcon.imageset/Black.png')
                : require('../../ios/learnX/Assets.xcassets/MaskedAppIcon.imageset/MaskedAppIcon.png')
            }
          />
          <TextInput
            style={styles.textInput}
            label="用户名 / 学号"
            textContentType="username"
            autoCompleteType="username"
            returnKeyType="next"
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            enablesReturnKeyAutomatically
            onSubmitEditing={handleNext}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            ref={passwordTextInputRef}
            style={styles.textInput}
            label="密码"
            textContentType="password"
            autoCompleteType="password"
            returnKeyType="done"
            secureTextEntry
            enablesReturnKeyAutomatically
            value={password}
            onChangeText={setPassword}
          />
          <View style={styles.switchContainer}>
            <Switch
              style={Styles.spacex1}
              value={graduate}
              onValueChange={(checked) =>
                dispatch(setSetting('graduate', checked))
              }
            />
            <Text style={Styles.spacex1}>研究生</Text>
          </View>
          <View style={styles.noteContainer}>
            <Caption style={styles.note}>
              您的用户信息仅会被保存在本地，并经操作系统安全地加密
            </Caption>
          </View>
          <Button
            style={styles.button}
            mode="contained"
            loading={loading}
            disabled={loading}
            onPress={handleLogin}>
            登录
          </Button>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  logo: {
    width: 120,
    height: 120,
    marginVertical: 16,
  },
  textInput: {
    width: '100%',
    marginVertical: 16,
  },
  button: {
    marginVertical: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  noteContainer: {
    alignItems: 'center',
    width: '60%',
  },
  note: {
    textAlign: 'center',
  },
});

export default Login;
