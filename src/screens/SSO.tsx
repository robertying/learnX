import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type WebView from 'react-native-webview';
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

/** Whether `url` is on one of Tsinghua's sites, over https. */
const isTsinghuaUrl = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && TSINGHUA_HOST.test(hostname);
  } catch {
    return false;
  }
};

/**
 * `url` over https when it's a plain http URL on one of Tsinghua's sites,
 * which all serve https; null for anything else. The app allows no cleartext
 * to them, so the login cookies never go out in the clear.
 */
const httpsTsinghuaUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' || !TSINGHUA_HOST.test(parsed.hostname)) {
      return null;
    }
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return null;
  }
};

const SSO: React.FC<Props> = ({ route, navigation }) => {
  const username = route.params.username;
  const password = route.params.password;

  const webView = useRef<WebView>(null);
  const [fingerPrint] = useState(generateFingerprint);
  const formData = useRef<{
    username: string;
    password: string;
    fingerPrint: string;
    fingerGenPrint: string;
    fingerGenPrint3: string;
  } | null>(null);

  // However the page is left (handed over to Web Learning, back, or closed
  // during the second factor), the app may log in by itself again.
  useEffect(() => () => setSSOInProgress(false), []);

  const injectedJs = fillSSOScript(ssoCustomScript, {
    username,
    password,
    deviceName: `${DeviceInfo.model()},learnX/${DeviceInfo.appVersion()}`,
    fingerPrint,
  });

  const handleShouldStartLoadWithRequest: OnShouldStartLoadWithRequest =
    event => {
      // A page that goes to one of Tsinghua's sites over http goes there over
      // https instead.
      const upgraded =
        event.isTopFrame === false ? null : httpsTsinghuaUrl(event.url);
      const url = upgraded ?? event.url;
      if (!url.startsWith(LEARN_ROAMING_URL)) {
        if (upgraded) {
          webView.current?.injectJavaScript(
            `location.replace(${JSON.stringify(upgraded)}); true;`,
          );
          return false;
        }
        // Frames load as they like; the page itself stays on Tsinghua's
        // sites, and a link elsewhere opens outside the app.
        if (
          event.isTopFrame === false ||
          url === 'about:blank' ||
          isTsinghuaUrl(url)
        ) {
          return true;
        }
        if (/^https?:/i.test(url)) {
          Linking.openURL(url).catch(() => {});
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
    // Only Tsinghua's own pages, where the injected scripts run (preval/sso.js,
    // which holds the password, only on id.tsinghua.edu.cn).
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
      ref={webView}
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
