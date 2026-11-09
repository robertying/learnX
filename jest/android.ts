// The Android run (see jest.config.js): Compose stand-ins in place of the
// empty modules jest/setup.ts gives the widgets.
jest.mock('@expo/ui/jetpack-compose', () => require('./mocks/expoCompose'));
jest.mock('@expo/ui/jetpack-compose/modifiers', () =>
  require('./mocks/expoComposeModifiers'),
);

// The system toast's native module, which only the Android build of React
// Native looks up.
jest.mock(
  'react-native/Libraries/Components/ToastAndroid/NativeToastAndroid',
  () => ({
    __esModule: true,
    default: {
      getConstants: () => ({ SHORT: 0, LONG: 1, TOP: 0, BOTTOM: 1, CENTER: 2 }),
      show: jest.fn(),
      showWithGravity: jest.fn(),
      showWithGravityAndOffset: jest.fn(),
    },
  }),
);

// SystemIcon's Material Symbols font, as if already loaded
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-symbols/androidWeights/regular', () => ({
  __esModule: true,
  default: { name: 'MaterialSymbols_400Regular', font: 1 },
}));
