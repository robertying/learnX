// A test fails when it logs an error or warning it doesn't expect (a React or
// act() warning, a failed prop type), so the test output stays clean. A test
// that expects one spies on it: jest.spyOn(console, 'error').mockImplementation().
const logged: string[] = [];

for (const level of ['error', 'warn'] as const) {
  const log = console[level];
  console[level] = (...args: unknown[]) => {
    logged.push(`console.${level}: ${args.map(String).join(' ')}`);
    log(...args);
  };
}

afterEach(() => {
  if (logged.length > 0) {
    const messages = logged.splice(0).join('\n\n');
    throw new Error(`Unexpected console output:\n\n${messages}`);
  }
});

// TanStack Query tells mounted components about cache changes from a timer,
// outside the act() a test wraps its step in, which React warns about. Run
// those notifications in act() while a test is rendering with React.
const { notifyManager } = require('@tanstack/react-query');
const { act } = require('react');
notifyManager.setNotifyFunction((notify: () => void) => {
  if (
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT
  ) {
    act(notify);
  } else {
    notify();
  }
});
