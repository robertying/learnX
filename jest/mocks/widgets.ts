// Widgets need the native module; each createWidget returns mocked methods.
export const createWidget = jest.fn(() => ({
  updateSnapshot: jest.fn(),
  updateTimeline: jest.fn(),
  reload: jest.fn(),
}));
