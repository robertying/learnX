import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Caption, Switch, TextInput, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import useToast from 'hooks/useToast';
import { useAppDispatch, useAppSelector } from 'data/store';
import {
  login,
  loginWithOfflineMode,
  setSSOInProgress,
} from 'data/actions/auth';
import { setMockStore } from 'data/actions/root';
import { setSetting } from 'data/actions/settings';
import { clearLoginCookies } from 'data/source';
import Styles from 'constants/Styles';
import SafeArea from 'components/SafeArea';
import Logo from 'components/Logo';
import env from 'helpers/env';
import { t } from 'helpers/i18n';
import { LoginStackParams } from './types';

type Props = NativeStackScreenProps<LoginStackParams, 'Login'>;

const Login: React.FC<Props> = ({ navigation }) => {
  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggingIn = useAppSelector(state => state.auth.loggingIn);
  const graduate = useAppSelector(state => state.settings.graduate);
  const savedUsername = useAppSelector(state => state.auth.username);
  const savedPassword = useAppSelector(state => state.auth.password);
  const savedFingerPrint = useAppSelector(state => state.auth.fingerPrint);

  const [username, setUsername] = useState(savedUsername ?? '');
  const [password, setPassword] = useState(savedPassword ?? '');
  const passwordTextInputRef = useRef<any>(null);

  const hasCredential = savedUsername && savedPassword && savedFingerPrint;

  const handleNext = () => {
    passwordTextInputRef.current?.focus();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!username) {
      toast(t('missingUsername'), 'error');
      return;
    }

    if (!password) {
      toast(t('missingPassword'), 'error');
      return;
    }

    if (username === env.DUMMY_USERNAME && password === env.DUMMY_PASSWORD) {
      dispatch(setMockStore());
      return;
    }

    Alert.alert(
      t('sso'),
      t('ssoNote'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('ok'),
          onPress: async () => {
            dispatch(setSSOInProgress(true));

            await clearLoginCookies();
            (navigation.navigate as any)('SSO', {
              username,
              password,
            });
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  const handleRetryLogin = () => {
    dispatch(login({ reset: true }));
  };

  const handleLoginWithOfflineMode = () => {
    dispatch(loginWithOfflineMode());
  };

  return (
    <SafeArea>
      <ScrollView style={Styles.flex1} contentContainerStyle={styles.root}>
        <KeyboardAvoidingView
          style={styles.inputs}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Logo iosSize={120} style={styles.logo} />
          <TextInput
            style={styles.textInput}
            label={t('usernameOrId')}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            enablesReturnKeyAutomatically
            onSubmitEditing={handleNext}
            value={username}
            onChangeText={v => setUsername(v.trim())}
          />
          <TextInput
            ref={passwordTextInputRef}
            style={styles.textInput}
            label={t('password')}
            textContentType="password"
            autoComplete="password"
            returnKeyType="done"
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            enablesReturnKeyAutomatically
            value={password}
            onChangeText={v => setPassword(v.trim())}
          />
          <View style={styles.switchContainer}>
            <Switch
              style={Styles.spacex1}
              value={graduate}
              onValueChange={checked => {
                dispatch(setSetting('graduate', checked));
              }}
            />
            <Text style={Styles.spacex1}>{t('graduate')}</Text>
          </View>
          <View style={styles.noteContainer}>
            <Caption style={styles.note}>{t('securityNote')}</Caption>
          </View>
          <Button
            style={styles.button}
            mode="contained"
            loading={loggingIn}
            disabled={loggingIn}
            onPress={handleLogin}
          >
            {t('login')}
          </Button>
          {hasCredential && (
            <>
              <Button
                style={styles.button}
                mode="text"
                onPress={handleRetryLogin}
              >
                {t('retryLogin')}
              </Button>
              <Button mode="text" onPress={handleLoginWithOfflineMode}>
                {t('offlineMode')}
              </Button>
            </>
          )}
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
  logo: {
    marginBottom: Platform.OS === 'android' ? -16 : 16,
  },
  inputs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  textInput: {
    width: '100%',
    marginVertical: 16,
  },
  button: {
    marginTop: 16,
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
