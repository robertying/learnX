import * as Crypto from 'expo-crypto';

export const generateFingerprint = () => {
  return Crypto.randomUUID().replaceAll('-', '');
};
