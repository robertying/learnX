// Stands in for @expo/ui/swift-ui/modifiers in the Electron app: every
// modifier is a function that records its name and arguments, which the
// SwiftUI stand-ins (swiftUI.tsx) read where they have a meaning on the web.
// Properties of a modifier are modifiers too (`shapes.rectangle()`,
// `Animation.easeInOut({ … })`).
const modifier = type =>
  new Proxy((...args) => ({ $type: type, $args: args }), {
    get: (target, prop) =>
      typeof prop === 'symbol' || prop in target
        ? target[prop]
        : modifier(`${type}.${prop}`),
  });

module.exports = new Proxy(
  { __esModule: true },
  {
    get: (target, prop) =>
      typeof prop === 'symbol' || prop in target
        ? target[prop]
        : prop === 'then'
          ? undefined
          : modifier(prop),
  },
);
