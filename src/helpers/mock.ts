import env from 'helpers/env';

/** Mock account whose data is reset on every login and not persisted. */
export const isEphemeralMockUser = (username?: string | null) =>
  !!username && username === env.DUMMY_USERNAME;

/** Mock account whose data and login survive app restarts. */
export const isPersistentMockUser = (username?: string | null) =>
  !!username && username === env.DUMMY_PERSIST_USERNAME;

export const isMockUser = (username?: string | null) =>
  isEphemeralMockUser(username) || isPersistentMockUser(username);
