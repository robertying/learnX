import type { LoginFailure } from 'helpers/errors';
import { t } from 'helpers/i18n';

/** The toast for a login that failed: what went wrong and what to do. */
export const loginFailedMessage = (failure: LoginFailure | null) => {
  switch (failure) {
    case 'offline':
      return t('loginFailedOffline');
    case 'serverError':
      return t('loginFailedServerError');
    case 'badCredential':
      return t('loginFailedBadCredential');
    case 'untrustedDevice':
      return t('loginFailedUntrustedDevice');
    default:
      return t('loginFailed');
  }
};

/** The lists' status row for a saved login that failed (`SyncStatus`). */
export const loginFailedStatus = (failure: LoginFailure) => {
  switch (failure) {
    case 'offline':
      return t('syncStatusOffline');
    case 'serverError':
      return t('syncStatusServerError');
    case 'badCredential':
      return t('syncStatusBadCredential');
    case 'untrustedDevice':
      return t('syncStatusUntrustedDevice');
    case 'failed':
      return t('syncStatusLoginFailed');
  }
};
