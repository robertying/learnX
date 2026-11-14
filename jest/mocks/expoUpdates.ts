// expo-updates with updates turned off, as in a debug build. Tests that need
// them on use jest.replaceProperty and the mocked functions.
export const isEnabled = false;
export const updateId: string | null = null;
export const useUpdates = jest.fn(() => ({
  isUpdateAvailable: false,
  isUpdatePending: false,
}));
export const checkForUpdateAsync = jest.fn(async () => ({
  isAvailable: false,
}));
export const fetchUpdateAsync = jest.fn(async () => ({ isNew: false }));
export const reloadAsync = jest.fn(async () => {});
