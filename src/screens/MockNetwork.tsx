import { useSyncExternalStore } from 'react';
import { login } from 'data/login';
import {
  getMockNetworkConfig,
  MockFailure,
  MockLatency,
  setMockNetworkConfig,
  subscribeMockNetworkConfig,
} from 'data/mockSource';
import { Form, FormButton, FormSection, FormToggle } from 'components/Form';
import SafeArea from 'components/SafeArea';
import { toast } from 'components/Toast';
import { t } from 'helpers/i18n';

// A dev-only tool for the mock accounts, so it is not translated.

const latencies: [MockLatency, string][] = [
  ['none', 'None'],
  ['normal', 'Normal (0.3–1.2 s)'],
  ['slow', 'Slow (3–6 s)'],
];

const failures: [MockFailure, string][] = [
  ['none', 'Succeed'],
  ['offline', 'Fail: offline'],
  ['serverError', 'Fail: server error'],
  ['timeout', 'Fail: time out after 20 s'],
];

const MockNetwork: React.FC = () => {
  const config = useSyncExternalStore(
    subscribeMockNetworkConfig,
    getMockNetworkConfig,
  );

  const handleReLogin = () => {
    // What the app does when it comes back after 10 minutes.
    void login({ reset: true });
    toast(t('loggingIn'), 'none', 1 * 1000);
  };

  return (
    <SafeArea>
      <Form>
        <FormSection title="Latency">
          {latencies.map(([value, label]) => (
            <FormButton
              key={value}
              testID={`mock-network-latency-${value}`}
              title={label}
              selected={config.latency === value}
              onPress={() => setMockNetworkConfig({ latency: value })}
            />
          ))}
        </FormSection>
        <FormSection
          title="Requests"
          footer="Applies to every request, login and file downloads included. A file already downloaded opens without a request; refresh it to download it again. A refresh logs in first, so it takes about twice the latency."
        >
          {failures.map(([value, label]) => (
            <FormButton
              key={value}
              testID={`mock-network-failure-${value}`}
              title={label}
              selected={config.failure === value}
              onPress={() => setMockNetworkConfig({ failure: value })}
            />
          ))}
        </FormSection>
        <FormSection
          title="Login"
          footer="A failed login returns to the login screen, which links back here. The ephemeral mock account ignores login results, so use the persistent one to test logging in again. Settings reset when the app reloads."
        >
          <FormToggle
            testID="mock-network-login-fails"
            icon={{ ios: 'key.slash', android: 'form-textbox-password' }}
            title="Reject login (bad credential)"
            value={config.loginFails}
            onValueChange={value => setMockNetworkConfig({ loginFails: value })}
          />
          <FormButton
            testID="mock-network-relogin"
            icon={{
              ios: 'rectangle.portrait.and.arrow.forward',
              android: 'login',
            }}
            title="Log in again now"
            onPress={handleReLogin}
          />
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default MockNetwork;
