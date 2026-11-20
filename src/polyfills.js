// expo-crypto loads its native module when it's first required, which took
// about 60 ms of a Pixel 4's launch before the first screen; nothing needs
// it that early, so it's required on first use.
const expoCrypto = () => require('expo-crypto');
global.crypto = {
  getRandomValues: array => expoCrypto().getRandomValues(array),
  randomUUID: () => expoCrypto().randomUUID(),
  subtle: {
    digest: (algorithm, data) =>
      expoCrypto().digest(
        typeof algorithm === 'string' ? algorithm : algorithm.name,
        data,
      ),
  },
};

import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
