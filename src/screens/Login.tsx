import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInputInstance,
  View,
} from 'react-native';
import TextField from 'components/TextField';
import TextButton from 'components/TextButton';
import Switch from 'components/Switch';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { toast } from 'components/Toast';
import { setSetting, useSettings } from 'data/settings';
import { setSSOInProgress, useLoggingIn } from 'data/auth';
import { login, loginWithMockAccount, loginWithOfflineMode } from 'data/login';
import { saveCredentials, useCredentials } from 'data/credentials';
import { clearLoginCookies } from 'data/source';
import Styles from 'constants/Styles';
import SafeArea from 'components/SafeArea';
import Logo from 'components/Logo';
import ContainedButton from 'components/ContainedButton';
import env from 'helpers/env';
import { isMockUser, MOCK_FINGER_PRINT } from 'helpers/mock';
import { t } from 'helpers/i18n';
import { LoginStackParams } from './types';
import { Caption, Text } from 'components/Text';

type Props = NativeStackScreenProps<LoginStackParams, 'Login'>;

const Login: React.FC<Props> = ({ navigation }) => {
  const loggingIn = useLoggingIn();
  const graduate = useSettings(settings => settings.graduate);
  const savedCredentials = useCredentials();
  const savedUsername = savedCredentials?.username;
  const savedPassword = savedCredentials?.password;
  const savedFingerPrint = savedCredentials?.fingerPrint;

  const [username, setUsername] = useState(savedUsername ?? '');
  const [password, setPassword] = useState(savedPassword ?? '');
  const passwordTextInputRef = useRef<TextInputInstance>(null);

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

    if (
      (username === env.DUMMY_USERNAME && password === env.DUMMY_PASSWORD) ||
      (username === env.DUMMY_PERSIST_USERNAME &&
        password === env.DUMMY_PERSIST_PASSWORD)
    ) {
      loginWithMockAccount(username);
      if (username === env.DUMMY_PERSIST_USERNAME) {
        // Goes through the emulated server and saves the login, so it
        // survives relaunch.
        void login({ username, password, fingerPrint: MOCK_FINGER_PRINT });
      } else {
        // The ephemeral account skips the login and is kept in memory only.
        await saveCredentials({
          username,
          password,
          fingerPrint: MOCK_FINGER_PRINT,
          fingerGenPrint: '',
          fingerGenPrint3: '',
        }).catch(() => undefined);
      }
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
            setSSOInProgress(true);

            await clearLoginCookies();
            navigation.navigate('SSO', {
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
    void login({ reset: true });
  };

  const handleLoginWithOfflineMode = () => {
    loginWithOfflineMode();
  };

  return (
    <SafeArea>
      <ScrollView
        style={Styles.flex1}
        contentContainerStyle={styles.root}
        automaticallyAdjustKeyboardInsets
      >
        <KeyboardAvoidingView
          style={styles.inputs}
          behavior="padding"
          enabled={Platform.OS !== 'ios'}
        >
          <Logo iosSize={120} style={styles.logo} />
          <View style={styles.switchContainer}>
            <Switch
              accessibilityLabel={t('graduate')}
              style={Styles.spacex1}
              value={graduate}
              onValueChange={checked => {
                setSetting('graduate', checked);
              }}
            />
            <Text style={Styles.spacex1}>{t('graduate')}</Text>
          </View>
          <TextField
            testID="login-username"
            style={styles.textInput}
            label={t('usernameOrId')}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
            keyboardType="ascii-capable"
            autoCapitalize="none"
            autoCorrect={false}
            enablesReturnKeyAutomatically
            submitBehavior="submit"
            onSubmitEditing={handleNext}
            value={username}
            onChangeText={v => setUsername(v.trim())}
          />
          <TextField
            ref={passwordTextInputRef}
            testID="login-password"
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
            onSubmitEditing={handleLogin}
            value={password}
            onChangeText={v => setPassword(v.trim())}
          />
          <View style={styles.noteContainer}>
            <Caption style={styles.note}>{t('securityNote')}</Caption>
          </View>
          <ContainedButton
            style={styles.button}
            label={t('login')}
            disabled={loggingIn}
            onPress={handleLogin}
          />
          {hasCredential && (
            <>
              <TextButton
                style={[styles.button, styles.textButton]}
                onPress={handleRetryLogin}
              >
                {t('retryLogin')}
              </TextButton>
              <TextButton
                style={styles.textButton}
                onPress={handleLoginWithOfflineMode}
              >
                {t('offlineMode')}
              </TextButton>
            </>
          )}
          {__DEV__ && isMockUser(savedUsername) && (
            <TextButton
              testID="login-mock-network"
              style={styles.textButton}
              onPress={() => navigation.navigate('MockNetwork')}
            >
              Network emulation
            </TextButton>
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
    marginVertical: 12,
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
  textButton: {
    marginVertical: 10,
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
