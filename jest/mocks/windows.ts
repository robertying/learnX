// The native window module: one window that can't open others, unless a test
// says otherwise (`jest.mocked(Windows.targetWindowId)`).
export const Windows = {
  supportsMultipleWindows: jest.fn(() => false),
  targetWindowId: jest.fn((): string | null => null),
  setWindowLink: jest.fn(),
  openWindow: jest.fn(() => Promise.resolve()),
};
