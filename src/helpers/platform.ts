import { Platform } from 'react-native';

// Which platform the app runs on, for code that differs between them. Ask
// for the platform a branch is for (`isApple()` for an Apple API or design,
// `isAndroid()` for Android's) rather than for "not the other one", so a
// platform added later takes neither branch by accident. Each reads
// `Platform.OS` when called, which tests switch with
// `jest.replaceProperty(Platform, 'OS', …)`.

/** iOS, iPadOS and Mac Catalyst, which all run as `Platform.OS` 'ios'. */
export const isApple = () => Platform.OS === 'ios';

export const isAndroid = () => Platform.OS === 'android';

/** The Electron app, a React Native Web build: the only one that runs on web. */
export const isElectron = () => Platform.OS === 'web';
