// Stand-in for src/helpers/env.ts, which reads .env at build time
export const getCourseXRefreshToken = (): string | undefined => undefined;

export default {
  DUMMY_USERNAME: 'mock-user',
  DUMMY_PASSWORD: 'mock-password',
};
