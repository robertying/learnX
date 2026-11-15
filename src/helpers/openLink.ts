import { Linking } from 'react-native';

/**
 * Opens a web page or a mailto: link in the app that handles it. A link
 * nothing can open (no mail account set up, say) does nothing, as in the
 * system's own apps, rather than leave an unhandled rejection.
 */
export const openLink = (url: string) => {
  Linking.openURL(url).catch(() => {});
};
