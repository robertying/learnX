import { Platform } from 'react-native';
import { isAndroid, isApple, isElectron } from 'helpers/platform';

describe('platform', () => {
  test.each([
    ['ios', { isApple: true, isAndroid: false, isElectron: false }],
    ['android', { isApple: false, isAndroid: true, isElectron: false }],
    ['web', { isApple: false, isAndroid: false, isElectron: true }],
    ['windows', { isApple: false, isAndroid: false, isElectron: false }],
  ] as const)('on %s', (os, expected) => {
    jest.replaceProperty(Platform, 'OS', os);
    expect({
      isApple: isApple(),
      isAndroid: isAndroid(),
      isElectron: isElectron(),
    }).toEqual(expected);
  });
});
