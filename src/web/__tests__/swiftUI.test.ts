// The Electron app's @expo/ui/swift-ui and its modifiers (aliases.json).
const swiftUI = require('../packages/swiftUI') as Record<
  string | symbol,
  unknown
>;

test('fails by name when a SwiftUI view or modifier is used', () => {
  expect(() => swiftUI.Host).toThrow(
    "@expo/ui's SwiftUI Host isn't in the Electron app: give the component a .web.tsx variant",
  );
  expect(() => swiftUI.padding).toThrow(/SwiftUI padding/);
});

test('reads as an ES module, not a promise', () => {
  expect(swiftUI.__esModule).toBe(true);
  expect(swiftUI.then).toBeUndefined();
  expect(swiftUI[Symbol.toStringTag]).toBeUndefined();
});
