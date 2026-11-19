import {
  loginFailedMessage,
  loginFailedStatus,
} from 'helpers/loginFailureText';
import { t } from 'helpers/i18n';

it.each([
  ['offline', 'loginFailedOffline', 'syncStatusOffline'],
  ['serverError', 'loginFailedServerError', 'syncStatusServerError'],
  ['badCredential', 'loginFailedBadCredential', 'syncStatusBadCredential'],
  [
    'untrustedDevice',
    'loginFailedUntrustedDevice',
    'syncStatusUntrustedDevice',
  ],
  ['failed', 'loginFailed', 'syncStatusLoginFailed'],
] as const)('says why a %s login failed', (failure, message, status) => {
  expect(loginFailedMessage(failure)).toBe(t(message));
  expect(loginFailedStatus(failure)).toBe(t(status));
});

it('gives the general message without a failure', () => {
  expect(loginFailedMessage(null)).toBe(t('loginFailed'));
});

it('no longer blames the network for a refused login', () => {
  expect(loginFailedMessage('badCredential')).not.toMatch(/connection/i);
  expect(loginFailedMessage('untrustedDevice')).not.toMatch(/connection/i);
  expect(loginFailedMessage('failed')).not.toMatch(/connection/i);
});
