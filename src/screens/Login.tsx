import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import LoginFields from 'components/LoginFields';
import TextButton from 'components/TextButton';
import Switch from 'components/Switch';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { toast } from 'components/Toast';
import { setSetting, useSettings } from 'data/settings';
import { setSSOInProgress, useAuthStore, useLoggingIn } from 'data/auth';
import { login, loginWithOfflineMode } from 'data/login';
import { useCredentials } from 'data/credentials';
import { clearLoginCookies } from 'data/source';
import Spacing from 'constants/Spacing';
import Styles from 'constants/Styles';
import SafeArea from 'components/SafeArea';
import Logo from 'components/Logo';
import ContainedButton from 'components/ContainedButton';
import env from 'helpers/env';
import { getLiveLogin } from 'services/launchOptions';
import { isMockUser, MOCK_FINGER_PRINT } from 'helpers/mock';
import { t } from 'helpers/i18n';
import { mockNetworkTitle } from 'navigation/options';
import { noteLoginShown } from 'hooks/useLaunchSheet';
import { LoginStackParams } from 'navigation/types';
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

  const hasCredential = savedUsername && savedPassword && savedFingerPrint;

  useEffect(() => {
    noteLoginShown();
  }, []);

  // Says when a login started here (after SSO, the mock or live test login, or
  // Retry Login) didn't go through. The saved login, if any, is kept, so this
  // is the only place it shows.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.loggingIn && !state.loggingIn && state.error) {
          const message = t('loginFailed');
          toast(
            // Debug and E2E builds say first why it failed and what the
            // server answered: the toast shows three lines, which the
            // message alone can fill.
            __DEV__ || env.TEST_LOGIN
              ? `${state.error}${state.errorDetail ? `: ${state.errorDetail}` : ''}\n${message}`
              : message,
            'error',
            { duration: 8 * 1000 },
          );
        }
      }),
    [],
  );

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
      // Goes through the emulated server, starts over from the mock data and
      // saves the login, so it survives relaunch.
      void login({ username, password, fingerPrint: MOCK_FINGER_PRINT });
      return;
    }

    // The live test account in live E2E runs (services/launchOptions.ts):
    // signs in with a saved device fingerprint instead of opening the SSO
    // page, which adds a device each time. The server checks the password.
    const liveLogin = getLiveLogin();
    if (liveLogin && username === liveLogin.username) {
      void login({ username, password, fingerPrint: liveLogin.fingerPrint });
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
          text: t('continue'),
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
    void login({});
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
              value={graduate}
              onValueChange={checked => {
                setSetting('graduate', checked);
              }}
            />
            <Text>{t('graduate')}</Text>
          </View>
          <LoginFields
            style={styles.textInput}
            username={username}
            password={password}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
            usernameLabel={t('usernameOrId')}
            passwordLabel={t('password')}
          />
          <View style={styles.noteContainer}>
            <Caption style={styles.note}>{t('securityNote')}</Caption>
          </View>
          <View style={styles.buttons}>
            <ContainedButton
              label={t('login')}
              disabled={loggingIn}
              onPress={handleLogin}
            />
            {hasCredential && (
              <>
                <TextButton onPress={handleRetryLogin}>
                  {t('retryLogin')}
                </TextButton>
                <TextButton onPress={handleLoginWithOfflineMode}>
                  {t('offlineMode')}
                </TextButton>
              </>
            )}
            {__DEV__ && isMockUser(savedUsername) && (
              <TextButton
                testID="login-mock-network"
                onPress={() => navigation.navigate('MockNetwork')}
              >
                {mockNetworkTitle}
              </TextButton>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeArea>
  );
};

const android = Platform.OS === 'android';

// Centered on Apple platforms, as Apple's sign-in pages are. Start-aligned on
// Android, as Material 3 pages and the welcome, set-up and What's New pages
// (FeatureList, Setup) are, with the buttons at the end of a row.
const styles = StyleSheet.create({
  // flexGrow, not flex: at large text sizes the content gets taller than the
  // screen and has to scroll.
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A little more room under the logo than between the rest. Android's logo
  // carries its own space below, and is pulled back so the X lines up with
  // the fields' start, as on the welcome page.
  logo: android
    ? { alignSelf: 'flex-start', marginBottom: -24, marginStart: -28 }
    : { marginBottom: Spacing.s },
  inputs: {
    flex: 1,
    alignItems: android ? 'stretch' : 'center',
    justifyContent: 'center',
    width: '80%',
    // A phone's width, also in a wide iPad or Mac window.
    maxWidth: 400,
    // Every child is a step apart; none has margins of its own.
    gap: Spacing.m,
  },
  textInput: {
    width: '100%',
  },
  // Android: the filled button at the end, with the text buttons before it
  // (wrapping when they don't fit), as in the What's New bar.
  buttons: android
    ? {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: Spacing.s,
      }
    : {
        alignItems: 'center',
        gap: Spacing.m,
      },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: android ? 'flex-start' : 'auto',
    gap: Spacing.s,
  },
  noteContainer: {
    alignItems: android ? 'stretch' : 'center',
    width: android ? '100%' : '60%',
  },
  note: {
    textAlign: android ? 'auto' : 'center',
  },
});

export default Login;
