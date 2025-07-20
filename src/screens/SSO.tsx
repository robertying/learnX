import { useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import WebView, {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import { useAppDispatch } from 'data/store';
import { login } from 'data/actions/auth';
import { LoginStackParams } from './types';

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
  const formData = useRef<{
    username: string;
    password: string;
    fingerPrint: string;
    fingerGenPrint: string;
    fingerGenPrint3: string;
  } | null>(null);
  const webviewRef = useRef<WebView>(null);

  const injectedJs = `
    (function () {
      "use strict";

      const setupLoginPage = () => {
        const usernameInput = document.querySelector("input#i_user");
        const passwordInput = document.querySelector("input#i_pass");
        const singleLoginCheckbox = document.querySelector(
          "input[type='checkbox'][name='singleLogin']",
        );

        // Exit if ANY of the key elements for the login page are not yet rendered.
        // This ensures we act only when the form is fully loaded.
        if (!usernameInput || !passwordInput || !singleLoginCheckbox) {
          return false;
        }

        // --- All required elements are present, now configure them ---

        // Populate username and password fields.
        usernameInput.value = "${username}";
        usernameInput.readOnly = true;

        passwordInput.value = "${password}";
        passwordInput.readOnly = true;

        // Check the "single login" checkbox for a longer session.
        singleLoginCheckbox.checked = true;
        singleLoginCheckbox.readOnly = true;
        singleLoginCheckbox.addEventListener('click', (e) => e.preventDefault(), { capture: true });

        return true; // Return true only when all tasks for this page are complete.
      };

      const setupTrustedDevicePage = () => {
        const trustedLoginCheckboxYes = document.querySelector(
          'input.form-check-input[type="radio"][value="是"]',
        );
        const trustedLoginCheckboxNo = document.querySelector(
          'input.form-check-input[type="radio"][value="否"]',
        );

        // Exit if either of the radio buttons for this page are not found.
        if (!trustedLoginCheckboxYes || !trustedLoginCheckboxNo) {
          return false;
        }

        const reactEventHandlers = Object.keys(trustedLoginCheckboxYes).find(k => k.startsWith('__reactEventHandlers'));
        if (!reactEventHandlers) {
          return false; // Ensure the element is ready for interaction.
        }

        // --- All required elements are present, now configure them ---

        // Select the "Yes" radio button.
        trustedLoginCheckboxYes.click();
        trustedLoginCheckboxYes.readOnly = true;
        trustedLoginCheckboxYes.addEventListener('click', (e) => e.preventDefault(), { capture: true });

        // Set the "No" radio button to read-only as well.
        trustedLoginCheckboxNo.readOnly = true;
        trustedLoginCheckboxNo.addEventListener('click', (e) => e.preventDefault(), { capture: true });

        return true;
      };

      /**
       * Overrides the jQuery submit function to intercept form data.
       * This allows capturing form submissions for external processing in React Native.
       */
      const overrideJQuerySubmit = () => {
        // Ensure jQuery is loaded and has not already been overridden.
        if (window.jQuery && !window.jQuery.fn.submit.isOverridden) {
          // Store a reference to the original submit function.
          const originalSubmit = window.jQuery.fn.submit;

          // Redefine the submit function.
          window.jQuery.fn.submit = function () {
            const formElement = this[0]; // 'this' is the jQuery object; this[0] is the DOM element.
            const formData = new FormData(formElement);
            const requestBody = Object.fromEntries(formData.entries());

            // Post the captured data to the React Native WebView.
            if (
              window.ReactNativeWebView &&
              window.ReactNativeWebView.postMessage
            ) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "JQUERY_SUBMIT_INTERCEPTED",
                  formId: formElement.id,
                  requestBody: requestBody,
                }),
              );
            }

            // Call the original submit function to allow the form submission to proceed.
            return originalSubmit.apply(this, arguments);
          };

          // Add a flag to prevent re-applying the override.
          window.jQuery.fn.submit.isOverridden = true;
        }
      };

      // 1. Set up an interval to check for jQuery and apply the submit override once available.
      const jqueryChecker = setInterval(() => {
        if (window.jQuery) {
          clearInterval(jqueryChecker);
          overrideJQuerySubmit();
        }
      }, 100);

      // 2. Attempt to set up the form fields immediately on script injection.
      if (setupLoginPage() || setupTrustedDevicePage()) {
        // If successful, no further action is needed for form filling.
      } else {
        // If elements aren't rendered yet, observe the DOM for changes.
        const observer = new MutationObserver((mutations, obs) => {
          // On any change, re-attempt to set up the page-specific fields.
          if (setupLoginPage() || setupTrustedDevicePage()) {
            // Once successful, disconnect the observer to save resources.
            obs.disconnect();
          }
        });

        // Start observing the entire document body for new nodes.
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      return true;
    })();
`;

  const handleNavigation = (event: WebViewNavigation) => {
    if (event.url.startsWith(LEARN_ROAMING_URL)) {
      webviewRef.current?.stopLoading();

      dispatch(login(formData.current!));
      navigation.goBack();
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'JQUERY_SUBMIT_INTERCEPTED') {
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
        onNavigationStateChange={handleNavigation}
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
