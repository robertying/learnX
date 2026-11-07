import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { Caption } from 'react-native-paper';
import { useAppDispatch } from 'data/store';
import { login } from 'data/actions/auth';
import {
  getMockNetworkConfig,
  MockFailure,
  MockLatency,
  setMockNetworkConfig,
  subscribeMockNetworkConfig,
} from 'data/mockSource';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
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
  const dispatch = useAppDispatch();
  const config = useSyncExternalStore(
    subscribeMockNetworkConfig,
    getMockNetworkConfig,
  );

  const handleReLogin = () => {
    // What the app does when it comes back after 10 minutes.
    dispatch(login({ reset: true }));
    toast(t('loggingIn'), 'none', 1 * 1000);
  };

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <Caption style={styles.header}>Latency</Caption>
        {latencies.map(([value, label]) => (
          <TableCell
            key={value}
            testID={`mock-network-latency-${value}`}
            iconName={
              config.latency === value
                ? 'radio-button-checked'
                : 'radio-button-unchecked'
            }
            primaryText={label}
            type="none"
            onPress={() => setMockNetworkConfig({ latency: value })}
          />
        ))}
        <Caption style={styles.header}>Requests</Caption>
        {failures.map(([value, label]) => (
          <TableCell
            key={value}
            testID={`mock-network-failure-${value}`}
            iconName={
              config.failure === value
                ? 'radio-button-checked'
                : 'radio-button-unchecked'
            }
            primaryText={label}
            type="none"
            onPress={() => setMockNetworkConfig({ failure: value })}
          />
        ))}
        <Caption style={styles.caption}>
          Applies to every request, login and file downloads included. A file
          already downloaded opens without a request; refresh it to download it
          again.
        </Caption>
        <Caption style={styles.header}>Login</Caption>
        <TableCell
          testID="mock-network-login-fails"
          iconName="password"
          primaryText="Reject login (bad credential)"
          switchValue={config.loginFails}
          onSwitchValueChange={value =>
            setMockNetworkConfig({ loginFails: value })
          }
          type="switch"
        />
        <TableCell
          testID="mock-network-relogin"
          iconName="login"
          primaryText="Log in again now"
          type="none"
          onPress={handleReLogin}
        />
        <Caption style={styles.caption}>
          A failed login returns to the login screen, which links back here. The
          ephemeral mock account ignores login results, so use the persistent
          one to test logging in again. Settings reset when the app reloads.
        </Caption>
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  scrollViewPaddings: {
    paddingVertical: 16,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  caption: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});

export default MockNetwork;
