import CookieManager from '@preeternal/react-native-cookie-manager';
import Urls from 'constants/Urls';
import { recordError } from 'services/crashReporting';
import { syncWebViewCookies } from 'services/webViewCookies';

jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));

const session = {
  JSESSIONID: { name: 'JSESSIONID', value: 'abc', sameSite: 'none' },
  XSRF: { name: 'XSRF', value: 'x' },
};

it('copies the cookies into the web views’ store and returns them as a header', async () => {
  jest.mocked(CookieManager.get).mockResolvedValueOnce(session as never);
  await expect(syncWebViewCookies()).resolves.toBe('JSESSIONID=abc; XSRF=x');
  expect(CookieManager.get).toHaveBeenCalledWith(Urls.learn);
  // A cross-site cookie is made secure, or the web view wouldn't send it.
  expect(CookieManager.set).toHaveBeenCalledWith(
    Urls.learn,
    { ...session.JSESSIONID, secure: true },
    true,
  );
  expect(CookieManager.set).toHaveBeenCalledWith(
    Urls.learn,
    session.XSRF,
    true,
  );
  expect(recordError).not.toHaveBeenCalled();
});

it('returns no header when the store can’t be read', async () => {
  const error = new Error('store');
  jest.mocked(CookieManager.get).mockRejectedValueOnce(error);
  await expect(syncWebViewCookies()).resolves.toBe('');
  expect(CookieManager.set).not.toHaveBeenCalled();
  expect(recordError).toHaveBeenCalledWith(error);
});

it('records a failed copy and still returns the header', async () => {
  const error = new Error('set');
  jest.mocked(CookieManager.get).mockResolvedValueOnce(session as never);
  jest.mocked(CookieManager.set).mockRejectedValueOnce(error);
  await expect(syncWebViewCookies()).resolves.toBe('JSESSIONID=abc; XSRF=x');
  expect(recordError).toHaveBeenCalledWith(error);
});
