import { generateFingerprint } from 'helpers/fingerprint';

// expo-crypto is ESM only; Node's UUIDs stand in for the native ones.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));

it('makes a fresh 32-digit hex fingerprint each time', () => {
  const a = generateFingerprint();
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(generateFingerprint()).not.toBe(a);
});
