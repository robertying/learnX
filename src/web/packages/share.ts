/**
 * Stands in for react-native-share in the Electron app, which has no share
 * sheet: opening one fails. The app offers no Share there; Save As, Open and
 * Show in Folder take its place (services/files/electron).
 */
const Share = {
  open: async (): Promise<never> => {
    throw new Error('No share sheet in the Electron app');
  },
};

export default Share;
