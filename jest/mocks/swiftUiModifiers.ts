/**
 * `@expo/ui/swift-ui/modifiers`: every modifier is a `jest.fn` returning
 * nothing, so app code can use any modifier without a change here.
 * `disabled` returns `{ disabled }`, which the Button and TextField stand-ins
 * read so tests can tell a disabled control.
 */
const modifiers: Record<string | symbol, unknown> = {
  __esModule: true,
  Animation: { easeInOut: jest.fn() },
  shapes: { rectangle: jest.fn() },
  disabled: jest.fn((isDisabled: boolean) => ({ disabled: isDisabled })),
};

// CommonJS, so the whole object (spread or Proxy) is the module.
declare const module: { exports: unknown };
module.exports = new Proxy(modifiers, {
  get: (target, name) => {
    if (!(name in target) && typeof name === 'string') {
      target[name] = jest.fn();
    }
    return target[name];
  },
});
