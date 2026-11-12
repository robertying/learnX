// Stand-in for src/helpers/env.ts, which reads .env at build time
export const getCourseXRefreshToken = (): string | undefined => undefined;

export default {
  DUMMY_USERNAME: 'mock-user',
  DUMMY_PASSWORD: 'mock-password',
  LIVE_USERNAME: 'live-user',
  LIVE_PASSWORD: 'live-password',
  LIVE_FINGERPRINT: 'live-fingerprint',
};
