import { Buffer } from 'buffer';
global.Buffer = Buffer;

import * as ExpoCrypto from 'expo-crypto';
global.crypto = {
  getRandomValues: ExpoCrypto.getRandomValues,
  randomUUID: ExpoCrypto.randomUUID,
  subtle: {
    digest: (algorithm, data) =>
      ExpoCrypto.digest(
        typeof algorithm === 'string' ? algorithm : algorithm.name,
        data,
      ),
  },
};

import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
