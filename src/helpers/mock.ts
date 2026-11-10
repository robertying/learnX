import env from 'helpers/env';

/** The mock account, which loads `data/mock.ts` from an emulated server. */
export const isMockUser = (username?: string | null) =>
  !!username && username === env.DUMMY_USERNAME;

/** Stands in for the SSO device fingerprint of the mock account. */
export const MOCK_FINGER_PRINT = 'fingerPrint';
