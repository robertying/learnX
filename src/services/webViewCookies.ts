import CookieManager from '@preeternal/react-native-cookie-manager';
import { recordError } from 'services/crashReporting';
import Urls from 'constants/Urls';

/**
 * Copies the Web Learning cookies the app's requests use into the web views'
 * store (WebKit's on iOS; Android and the Electron app have one store, where
 * this changes nothing), so pages and the images in them load with the
 * session. Resolves with the cookies as a `Cookie` header, empty when the
 * store can't be read; a failed copy is recorded, not thrown.
 */
export const syncWebViewCookies = async () => {
  let cookies: Awaited<ReturnType<typeof CookieManager.get>>;
  try {
    cookies = await CookieManager.get(Urls.learn);
  } catch (error) {
    recordError(error);
    return '';
  }
  await Promise.all(
    Object.values(cookies).map(value =>
      CookieManager.set(
        Urls.learn,
        // A cross-site cookie must be secure for the web view to send it.
        value.sameSite === 'none' ? { ...value, secure: true } : value,
        true,
      ),
    ),
  ).catch(recordError);
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value.value}`)
    .join('; ');
};
