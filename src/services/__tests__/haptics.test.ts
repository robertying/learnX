import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { playHaptic, type Haptic } from 'services/haptics';

const all: Haptic[] = [
  'success',
  'warning',
  'error',
  'threshold',
  'thresholdRelease',
  'longPress',
  'dragStart',
  'dragTick',
  'toggleOn',
  'toggleOff',
];

/** What each haptic played, by expo-haptics call */
const played = (haptics: Haptic[]) => {
  haptics.forEach(playHaptic);
  return {
    notification: jest.mocked(Haptics.notificationAsync).mock.calls,
    impact: jest.mocked(Haptics.impactAsync).mock.calls,
    selection: jest.mocked(Haptics.selectionAsync).mock.calls.length,
    android: jest.mocked(Haptics.performAndroidHapticsAsync).mock.calls,
  };
};

const onAndroid = (version: number) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version);
};

describe('playHaptic', () => {
  it('plays UIKit feedback on iOS, and nothing for switches', () => {
    expect(played(all)).toEqual({
      notification: [['success'], ['warning'], ['error']],
      impact: [['medium'], ['light'], ['medium'], ['medium']],
      selection: 1,
      android: [],
    });
  });

  it("plays the system's constants on Android 14 and later", () => {
    onAndroid(34);
    expect(played(all)).toEqual({
      notification: [],
      impact: [],
      selection: 0,
      android: [
        ['confirm'],
        ['reject'],
        ['reject'],
        ['segment-tick'],
        ['segment-tick'],
        ['long-press'],
        ['drag-start'],
        ['segment-frequent-tick'],
        ['toggle-on'],
        ['toggle-off'],
      ],
    });
  });

  it('falls back to older constants before Android 14', () => {
    onAndroid(30);
    expect(played(all).android).toEqual([
      ['confirm'],
      ['reject'],
      ['reject'],
      ['clock-tick'],
      ['clock-tick'],
      ['long-press'],
      ['long-press'],
      ['clock-tick'],
      ['clock-tick'],
      ['clock-tick'],
    ]);
  });

  it('plays the old vibrations for outcomes before Android 11', () => {
    onAndroid(28);
    const result = played(['success', 'warning', 'error', 'longPress']);
    expect(result.notification).toEqual([['success'], ['warning'], ['error']]);
    expect(result.android).toEqual([['long-press']]);
  });

  it('plays nothing elsewhere', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(played(all)).toEqual({
      notification: [],
      impact: [],
      selection: 0,
      android: [],
    });
  });

  it('swallows a haptic the device refuses', async () => {
    onAndroid(34);
    jest
      .mocked(Haptics.performAndroidHapticsAsync)
      .mockRejectedValueOnce(new Error('unsupported'));
    expect(() => playHaptic('toggleOn')).not.toThrow();
    await Promise.resolve();
  });
});
