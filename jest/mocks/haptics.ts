export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};
export const selectionAsync = jest.fn(() => Promise.resolve());
export const notificationAsync = jest.fn(() => Promise.resolve());
export const impactAsync = jest.fn(() => Promise.resolve());
