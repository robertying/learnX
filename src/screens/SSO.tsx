import { useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import type { OnShouldStartLoadWithRequest } from 'react-native-webview/lib/WebViewTypes';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'constants/DeviceInfo';
import SafeArea from 'components/SafeArea';
import { useAppDispatch } from 'data/store';
import { login, setSSOInProgress } from 'data/actions/auth';
import { generateFingerprint } from 'helpers/fingerprint';
import { LoginStackParams } from './types';
import packageJson from '../../package.json';

const ssoCustomScript = require('../helpers/preval/sso.preval.js');

const SSO_LOGIN_URL =
  'https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/bb5df85216504820be7bba2b0ae1535b/0';
const LEARN_ROAMING_URL =
  'https://learn.tsinghua.edu.cn/f/j_spring_security_thauth_roaming_entry';

type Props = NativeStackScreenProps<LoginStackParams, 'SSO'>;

const SSO: React.FC<Props> = ({ route, navigation }) => {
  const dispatch = useAppDispatch();

  const username = route.params.username;
  const password = route.params.password;

  const [progress, setProgress] = useState(0);

  const fingerPrint = useRef(generateFingerprint());
  const formData = useRef<{
    username: string;
    password: string;
    fingerPrint: string;
    fingerGenPrint: string;
    fingerGenPrint3: string;
  } | null>(null);
  const webviewRef = useRef<WebView>(null);

  const injectedJs = ssoCustomScript
    .replaceAll('${username}', username)
    .replaceAll("'${password}'", JSON.stringify(password)) // `password` may contain single quotes
    .replaceAll(
      '${deviceName}',
      `${DeviceInfo.model()},learnX/${packageJson.version}`,
    )
    .replaceAll('${fingerPrint}', fingerPrint.current);

  const handleShouldStartLoadWithRequest: OnShouldStartLoadWithRequest =
    event => {
      if (!event.url.startsWith(LEARN_ROAMING_URL)) {
        return true;
      }

      dispatch(login(formData.current!));
      dispatch(setSSOInProgress(false));
      navigation.goBack();

      return false;
    };

  const handleMessage = (event: WebViewMessageEvent) => {
    const { type, data } = JSON.parse(event.nativeEvent.data);

    if (type === 'JQUERY_SUBMIT' && data.formId === 'theform') {
      formData.current = {
        username,
        password,
        fingerPrint: data.requestBody.fingerPrint,
        fingerGenPrint: data.requestBody.fingerGenPrint,
        fingerGenPrint3: data.requestBody.fingerGenPrint3,
      };
    }
  };

  return (
    <SafeArea>
      {progress && progress !== 1 ? <ProgressBar progress={progress} /> : null}
      <WebView
        ref={webviewRef}
        style={styles.webview}
        source={{
          uri: SSO_LOGIN_URL,
          headers: {
            // Clean slate
            Cookie: '',
          },
        }}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
        onLoadProgress={({ nativeEvent }) => {
          setProgress(parseFloat(nativeEvent.progress.toFixed(2)));
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        injectedJavaScript={injectedJs}
        onMessage={handleMessage}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
});

export default SSO;
