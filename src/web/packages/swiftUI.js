// Stands in for @expo/ui's SwiftUI views and modifiers in the Electron app,
// which has no SwiftUI: every component that hosts them has a `.web.tsx`
// variant drawn with Fluent UI, and the widgets require their layouts only on
// Apple platforms (src/widgets/index.ts), a branch release builds fold away.
// So nothing should reach this module; one that does fails here, by name,
// rather than drawing nothing.
const missing = name => {
  throw new Error(
    `@expo/ui's SwiftUI ${name} isn't in the Electron app: give the component a .web.tsx variant`,
  );
};

module.exports = new Proxy(
  { __esModule: true },
  {
    get: (target, prop) =>
      typeof prop === 'symbol' || prop in target
        ? target[prop]
        : // Not a promise, for an `await import()`.
          prop === 'then'
          ? undefined
          : missing(prop),
  },
);
