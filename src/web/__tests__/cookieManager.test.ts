import CookieManager, { parseSetCookie } from 'web/packages/cookieManager';
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

describe('parseSetCookie', () => {
  it('reads the name, value and attributes', () => {
    expect(
      parseSetCookie(
        'JSESSIONID=abc=d; Path=/; Domain=.tsinghua.edu.cn; Secure; HttpOnly; Expires=Wed, 01 Jan 2031 00:00:00 GMT',
      ),
    ).toEqual({
      name: 'JSESSIONID',
      value: 'abc=d',
      path: '/',
      domain: '.tsinghua.edu.cn',
      secure: true,
      httpOnly: true,
      expires: '2031-01-01T00:00:00.000Z',
    });
  });

  it('reads an empty value and Max-Age', () => {
    jest.useFakeTimers({ now: new Date('2026-11-16T00:00:00Z') });
    expect(parseSetCookie('a=; Max-Age=60; SameSite=Lax')).toEqual({
      name: 'a',
      value: '',
      expires: '2026-11-16T00:01:00.000Z',
    });
  });

  it('takes a lone name as an empty cookie', () => {
    expect(parseSetCookie('flag')).toEqual({ name: 'flag', value: '' });
  });
});

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

it('sets a cookie, also from a Set-Cookie header', async () => {
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

  await CookieManager.setFromResponse(
    'https://id.tsinghua.edu.cn',
    'JSESSIONID=; path=/; HttpOnly',
  );
  expect(bridge.cookies.set).toHaveBeenLastCalledWith({
    url: 'https://id.tsinghua.edu.cn',
    name: 'JSESSIONID',
    value: '',
    path: '/',
    domain: undefined,
    secure: undefined,
    httpOnly: true,
    expirationDate: undefined,
  });
});

it('clears one cookie, or all of them', async () => {
  expect(
    await CookieManager.clearByName('https://id.tsinghua.edu.cn', 'a'),
  ).toBe(true);
  expect(bridge.cookies.remove).toHaveBeenCalledWith(
    'https://id.tsinghua.edu.cn',
    'a',
  );
  expect(await CookieManager.clearAll()).toBe(true);
  expect(await CookieManager.clearAllStores()).toBe(true);
  expect(bridge.cookies.clearAll).toHaveBeenCalledTimes(2);
  await CookieManager.flush();
  expect(bridge.cookies.flush).toHaveBeenCalled();
});
