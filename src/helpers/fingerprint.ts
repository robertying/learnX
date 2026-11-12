/** A new SSO device fingerprint: 32 random hex digits. */
export const generateFingerprint = () =>
  globalThis.crypto.randomUUID().replaceAll('-', '');
