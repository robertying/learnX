import {useEffect, useRef, useState} from 'react';
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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FailReason} from 'thu-learn-lib-no-native/lib/types';
import useToast from 'hooks/useToast';
import {useAppDispatch, useAppSelector} from 'data/store';
import {login} from 'data/actions/auth';
import {setMockStore} from 'data/actions/root';
import {setSetting} from 'data/actions/settings';
import Styles from 'constants/Styles';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';
import env from 'helpers/env';
import {t} from 'helpers/i18n';

const Login: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'Login'>>
> = () => {
  const theme = useTheme();

  const toast = useToast();

  const dispatch = useAppDispatch();
  const loggingIn = useAppSelector(state => state.auth.loggingIn);
  const error = useAppSelector(state => state.auth.error);
  const graduate = useAppSelector(state => state.settings.graduate);

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
      toast(t('missingUsername'), 'error');
      return;
    }

    if (!password) {
      toast(t('missingPassword'), 'error');
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
        await new Promise(resolve => setTimeout(resolve as any, 500));
        if (error === FailReason.BAD_CREDENTIAL) {
          toast(t('credentialError'), 'error');
        } else {
          toast(t('unknownError') + error, 'error');
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
            textColor="white"
            mode="contained"
            loading={loading}
            disabled={loading}
            onPress={handleLogin}>
            {t('login')}
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
