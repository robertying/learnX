import CookieManager from 'web/packages/cookieManager';
import type { Bridge } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

beforeEach(() => {
  bridge = installBridge();
});

afterEach(uninstallBridge);

it('gets the cookies for a URL by name', async () => {
  jest.mocked(bridge.cookies.get).mockResolvedValue([
    {
      name: 'JSESSIONID',
      value: 'abc',
      domain: 'learn.tsinghua.edu.cn',
      path: '/',
      secure: true,
      httpOnly: true,
      expirationDate: 1924992000,
    },
    { name: 'XSRF-TOKEN', value: 'xyz' },
  ]);
  expect(await CookieManager.get('https://learn.tsinghua.edu.cn')).toEqual({
    JSESSIONID: {
      name: 'JSESSIONID',
      value: 'abc',
      domain: 'learn.tsinghua.edu.cn',
      path: '/',
      secure: true,
      httpOnly: true,
      expires: '2031-01-01T00:00:00.000Z',
    },
    'XSRF-TOKEN': { name: 'XSRF-TOKEN', value: 'xyz' },
  });
  expect(bridge.cookies.get).toHaveBeenCalledWith(
    'https://learn.tsinghua.edu.cn',
  );
});

it('sets a cookie', async () => {
  expect(
    await CookieManager.set('https://learn.tsinghua.edu.cn', {
      name: 'a',
      value: '1',
      expires: '2031-01-01T00:00:00.000Z',
    }),
  ).toBe(true);
  expect(bridge.cookies.set).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'https://learn.tsinghua.edu.cn',
      name: 'a',
      value: '1',
      expirationDate: 1924992000,
    }),
  );

  await CookieManager.set('https://learn.tsinghua.edu.cn', {
    name: 'b',
    value: '2',
  });
  expect(bridge.cookies.set).toHaveBeenLastCalledWith(
    expect.objectContaining({ name: 'b', expirationDate: undefined }),
  );
});

it('clears one cookie, or all of them', async () => {
  expect(
    await CookieManager.clearByName('https://id.tsinghua.edu.cn', 'a'),
  ).toBe(true);
  expect(bridge.cookies.remove).toHaveBeenCalledWith(
    'https://id.tsinghua.edu.cn',
    'a',
  );
  expect(await CookieManager.clearAllStores()).toBe(true);
  expect(bridge.cookies.clearAll).toHaveBeenCalledTimes(1);
});
