/**
 * Stands in for react-native-share in the Electron app, which has no share
 * sheet: opening one fails, as a cancelled share would. Save As and dragging
 * files out replace it (phase 4 of the plan).
 */
const Share = {
  open: async (): Promise<never> => {
    throw new Error('No share sheet in the Electron app');
  },
};

export default Share;
