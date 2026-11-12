import { useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { OnShouldStartLoadWithRequest } from 'react-native-webview/lib/WebViewTypes';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'constants/DeviceInfo';
import ScreenWebView from 'components/ScreenWebView';
import { setSSOInProgress } from 'data/auth';
import { login } from 'data/login';
import { generateFingerprint } from 'helpers/fingerprint';
import { fillSSOScript } from 'helpers/ssoScript';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import { LoginStackParams } from 'navigation/types';

const ssoCustomScript = require('../helpers/preval/sso.preval.js');
const ssoAlertsScript: string = require('../helpers/preval/ssoAlerts.preval.js');

const SSO_LOGIN_URL =
  'https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/bb5df85216504820be7bba2b0ae1535b/0';
/** Where the account's trusted browsers are listed and deleted. */
export const TRUSTED_BROWSERS_URL = 'https://id.tsinghua.edu.cn/';
const LEARN_ROAMING_URL =
  'https://learn.tsinghua.edu.cn/f/j_spring_security_thauth_roaming_entry';

type Props = NativeStackScreenProps<LoginStackParams, 'SSO'>;

const TSINGHUA_HOST = /(^|\.)tsinghua\.edu\.cn$/;

/**
 * Whether `url` is on one of Tsinghua's sites, over https unless `http` is
 * allowed.
 */
const isTsinghuaUrl = (url: string, { http = false } = {}) => {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      (protocol === 'https:' || (http && protocol === 'http:')) &&
      TSINGHUA_HOST.test(hostname)
    );
  } catch {
    return false;
  }
};

const SSO: React.FC<Props> = ({ route, navigation }) => {
  const username = route.params.username;
  const password = route.params.password;

  const [fingerPrint] = useState(generateFingerprint);
  const formData = useRef<{
    username: string;
    password: string;
    fingerPrint: string;
    fingerGenPrint: string;
    fingerGenPrint3: string;
  } | null>(null);

  const injectedJs = fillSSOScript(ssoCustomScript, {
    username,
    password,
    deviceName: `${DeviceInfo.model()},learnX/${DeviceInfo.appVersion()}`,
    fingerPrint,
  });

  const handleShouldStartLoadWithRequest: OnShouldStartLoadWithRequest =
    event => {
      if (!event.url.startsWith(LEARN_ROAMING_URL)) {
        // Frames load as they like; the page itself stays on Tsinghua's
        // sites, and a link elsewhere opens outside the app.
        if (
          event.isTopFrame === false ||
          event.url === 'about:blank' ||
          isTsinghuaUrl(event.url, { http: true })
        ) {
          return true;
        }
        if (/^https?:/i.test(event.url)) {
          Linking.openURL(event.url).catch(() => {});
        }
        return false;
      }

      if (!formData.current?.fingerPrint) {
        // The login form wasn't captured, or without the device fingerprint
        toast(t('ssoFailed'), 'error');
      } else {
        void login(formData.current);
      }

      setSSOInProgress(false);
      navigation.goBack();

      return false;
    };

  const handleMessage = (event: WebViewMessageEvent) => {
    // Only Tsinghua's own pages, like the injected script (preval/sso.js),
    // which holds the password.
    if (!isTsinghuaUrl(event.nativeEvent.url)) {
      return;
    }
    let message: { type?: unknown; data?: any };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const { type, data } = message ?? {};

    if (type === 'JQUERY_SUBMIT' && data?.formId === 'theform') {
      formData.current = {
        username,
        password,
        fingerPrint: data.requestBody.fingerPrint,
        fingerGenPrint: data.requestBody.fingerGenPrint,
        fingerGenPrint3: data.requestBody.fingerGenPrint3,
      };
    } else if (type === 'TRUSTED_BROWSER_LIMIT') {
      // In place of the page's own alert (preval/ssoAlerts.js)
      Alert.alert(t('trustedBrowserLimit'), t('trustedBrowserLimitNote'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('manageTrustedBrowsers'),
          isPreferred: true,
          onPress: () => {
            Linking.openURL(TRUSTED_BROWSERS_URL).catch(() => {});
          },
        },
      ]);
    }
  };

  return (
    <ScreenWebView
      source={{
        uri: SSO_LOGIN_URL,
        headers: {
          // Clean slate
          Cookie: '',
        },
      }}
      onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      injectedJavaScriptBeforeContentLoaded={ssoAlertsScript}
      injectedJavaScript={injectedJs}
      onMessage={handleMessage}
    />
  );
};

export default SSO;
