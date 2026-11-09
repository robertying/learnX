// Stand-in for src/helpers/env.ts, which reads .env at build time
export const getCourseXRefreshToken = (): string | undefined => undefined;

export default {
  DUMMY_USERNAME: 'mock-user',
  DUMMY_PASSWORD: 'mock-password',
  DUMMY_PERSIST_USERNAME: 'mock-persist-user',
  DUMMY_PERSIST_PASSWORD: 'mock-persist-password',
};
