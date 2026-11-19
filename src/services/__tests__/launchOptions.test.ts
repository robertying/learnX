import { render } from '@testing-library/react-native';
import { createElement } from 'react';
import { Platform, Text } from 'react-native';
import {
  defaultMockNetworkConfig,
  getMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import {
  applyLaunchOptions,
  applyMockNetworkLink,
  getLiveLogin,
  takeLaunchNotification,
  withLaunchOptions,
} from 'services/launchOptions';
import env from 'test-utils/mocks/env';

const mockSettingsGet = jest.fn<unknown, [string]>();

jest.mock('react-native/Libraries/Settings/Settings', () => ({
  __esModule: true,
  default: { get: (key: string) => mockSettingsGet(key) },
}));

jest.mock('screens/StoreReport', () => {
  const { createElement: mockCreate } = jest.requireActual('react');
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => mockCreate(MockText, null, 'report'),
  };
});

afterEach(() => {
  setMockNetworkConfig(defaultMockNetworkConfig);
});

it('reads the latency from the launch arguments on iOS', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockSettingsGet.mockReturnValue('none');

  applyLaunchOptions({ mockLatency: 'slow' });

  expect(mockSettingsGet).toHaveBeenCalledWith('mockLatency');
  expect(getMockNetworkConfig().latency).toBe('none');
});

it('reads the latency from the initial props on Android', () => {
  jest.replaceProperty(Platform, 'OS', 'android');

  applyLaunchOptions({ mockLatency: 'slow' });

  expect(mockSettingsGet).not.toHaveBeenCalled();
  expect(getMockNetworkConfig().latency).toBe('slow');
});

it('reads how the emulated server fails', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  applyLaunchOptions({ mockFailure: 'offline' });
  expect(getMockNetworkConfig().failure).toBe('offline');
  applyLaunchOptions({ mockFailure: 'quickTimeout' });
  expect(getMockNetworkConfig().failure).toBe('quickTimeout');

  jest.replaceProperty(Platform, 'OS', 'ios');
  mockSettingsGet.mockImplementation(key =>
    key === 'mockFailure' ? 'serverError' : undefined,
  );
  applyLaunchOptions();
  expect(getMockNetworkConfig().failure).toBe('serverError');
});

it('reads whether the emulated server rejects logins, and how many', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  applyLaunchOptions({ mockLoginFails: 'true' });
  expect(getMockNetworkConfig().loginFails).toBe(true);
  applyLaunchOptions({ mockLoginFails: 'false' });
  expect(getMockNetworkConfig().loginFails).toBe(false);
  applyLaunchOptions({ mockLoginFails: '2' });
  expect(getMockNetworkConfig().loginFails).toBe(2);

  jest.replaceProperty(Platform, 'OS', 'ios');
  for (const [value, expected] of [
    [true, true],
    [false, false],
    [3, 3],
  ] as const) {
    mockSettingsGet.mockImplementation(key =>
      key === 'mockLoginFails' ? value : undefined,
    );
    applyLaunchOptions();
    expect(getMockNetworkConfig().loginFails).toBe(expected);
  }
});

it('reads what happens to the emulated session after the launch login', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  applyLaunchOptions({ mockSessionExpiry: 'passwordChanged' });
  expect(getMockNetworkConfig().sessionExpiry).toBe('passwordChanged');
  applyLaunchOptions({ mockSessionExpiry: 'sometimes' });
  expect(getMockNetworkConfig().sessionExpiry).toBe('passwordChanged');
});

it('ignores missing and unknown values', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  applyLaunchOptions();
  applyLaunchOptions({ mockLatency: 'instant', mockFailure: 'sometimes' });
  for (const mockLoginFails of ['yes', '-1', '1.5', '', 1.5, -1, null]) {
    applyLaunchOptions({ mockLoginFails });
  }
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockSettingsGet.mockReturnValue(undefined);
  applyLaunchOptions();

  expect(getMockNetworkConfig()).toEqual(defaultMockNetworkConfig);
});

describe('live login', () => {
  const live = { liveUsername: 'student', liveFingerprint: 'fp' };
  const dev = __DEV__;

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    delete (env as { TEST_LOGIN?: boolean }).TEST_LOGIN;
    applyLaunchOptions();
  });

  it('reads it from the initial props on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    applyLaunchOptions(live);
    expect(getLiveLogin()).toEqual({ username: 'student', fingerPrint: 'fp' });
  });

  it('reads it from the launch arguments on iOS', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockSettingsGet.mockImplementation(
      key => (live as Record<string, string>)[key],
    );
    applyLaunchOptions();
    expect(getLiveLogin()).toEqual({ username: 'student', fingerPrint: 'fp' });
  });

  it('needs both values', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    applyLaunchOptions({ liveUsername: 'student', liveFingerprint: '' });
    expect(getLiveLogin()).toBeUndefined();
    applyLaunchOptions({ liveUsername: 1, liveFingerprint: 'fp' });
    expect(getLiveLogin()).toBeUndefined();
  });

  it('is ignored by release builds other than E2E builds', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    applyLaunchOptions(live);
    expect(getLiveLogin()).toBeUndefined();

    (env as { TEST_LOGIN?: boolean }).TEST_LOGIN = true;
    applyLaunchOptions(live);
    expect(getLiveLogin()).toEqual({ username: 'student', fingerPrint: 'fp' });
  });
});

describe('postNotification', () => {
  const dev = __DEV__;

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    delete (env as { TEST_LOGIN?: boolean }).TEST_LOGIN;
    applyLaunchOptions();
  });

  it('hands it over once', () => {
    applyLaunchOptions({ postNotification: 'notice:n1' });
    expect(takeLaunchNotification()).toBe('notice:n1');
    expect(takeLaunchNotification()).toBeUndefined();
  });

  it('ignores an empty or odd value', () => {
    applyLaunchOptions({ postNotification: '' });
    expect(takeLaunchNotification()).toBeUndefined();
    applyLaunchOptions({ postNotification: 1 });
    expect(takeLaunchNotification()).toBeUndefined();
  });

  it('is ignored by release builds other than E2E builds', () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    applyLaunchOptions({ postNotification: 'notice:n1' });
    expect(takeLaunchNotification()).toBeUndefined();

    (env as { TEST_LOGIN?: boolean }).TEST_LOGIN = true;
    applyLaunchOptions({ postNotification: 'notice:n1' });
    expect(takeLaunchNotification()).toBe('notice:n1');
  });
});

describe('mockClock', () => {
  const dev = __DEV__;
  const RealDate = Date;
  const moment = '2026-11-18T09:41:00+08:00';

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  afterEach(() => {
    globalThis.Date = RealDate;
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    delete (env as { TEST_LOGIN?: boolean }).TEST_LOGIN;
  });

  it('starts the clock from the moment and keeps it running', () => {
    applyLaunchOptions({ mockClock: moment });

    const start = RealDate.parse(moment);
    expect(Date.now() - start).toBeGreaterThanOrEqual(0);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(new Date().getTime() - start).toBeLessThan(1000);
    expect(new Date()).toBeInstanceOf(RealDate);
  });

  it('leaves dates made from a value alone', () => {
    applyLaunchOptions({ mockClock: moment });

    expect(new Date(0).getTime()).toBe(0);
    expect(new Date(2026, 0, 2).getDate()).toBe(2);
    expect(Date.parse('1970-01-01T00:00:00Z')).toBe(0);
    expect(Date.UTC(1970, 0, 1)).toBe(0);
  });

  it('ignores a value that is not a moment', () => {
    applyLaunchOptions({ mockClock: 'soon' });
    applyLaunchOptions({ mockClock: 1 });
    expect(Date).toBe(RealDate);
  });

  it('is ignored by release builds other than E2E builds', () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    applyLaunchOptions({ mockClock: moment });
    expect(Date).toBe(RealDate);

    (env as { TEST_LOGIN?: boolean }).TEST_LOGIN = true;
    applyLaunchOptions({ mockClock: moment });
    expect(Date).not.toBe(RealDate);
  });
});

describe('mock network link', () => {
  const dev = __DEV__;

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    delete (env as { TEST_LOGIN?: boolean }).TEST_LOGIN;
  });

  it('sets the latency and failure while the app runs', () => {
    expect(
      applyMockNetworkLink(
        'learnx://mock-network?latency=slow&failure=offline',
      ),
    ).toBe(true);
    expect(getMockNetworkConfig()).toMatchObject({
      latency: 'slow',
      failure: 'offline',
    });
  });

  it('takes the link but ignores unknown values', () => {
    expect(
      applyMockNetworkLink('learnx://mock-network?latency=fast&other=1'),
    ).toBe(true);
    expect(getMockNetworkConfig()).toEqual(defaultMockNetworkConfig);
  });

  it('leaves other links alone', () => {
    expect(applyMockNetworkLink('learnx://today')).toBe(false);
  });

  it('is ignored by release builds other than E2E builds', () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    expect(applyMockNetworkLink('learnx://mock-network?latency=slow')).toBe(
      false,
    );
    expect(getMockNetworkConfig().latency).toBe('normal');

    (env as { TEST_LOGIN?: boolean }).TEST_LOGIN = true;
    applyMockNetworkLink('learnx://mock-network?latency=slow');
    expect(getMockNetworkConfig().latency).toBe('slow');
  });
});

describe('withLaunchOptions', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('applies the launch arguments before the app renders', async () => {
    let latencyAtRender: string | undefined;
    const App = () => {
      latencyAtRender = getMockNetworkConfig().latency;
      return createElement(Text, null, 'app');
    };
    const Root = withLaunchOptions(App);

    const screen = await render(createElement(Root, { mockLatency: 'none' }));

    expect(screen.getByText('app')).toBeTruthy();
    expect(latencyAtRender).toBe('none');
  });

  it('applies them only once, so a later change sticks', async () => {
    const Root = withLaunchOptions(() => createElement(Text, null, 'app'));
    const screen = await render(createElement(Root, { mockLatency: 'none' }));

    setMockNetworkConfig({ latency: 'slow' });
    await screen.rerender(createElement(Root, { mockLatency: 'none' }));

    expect(getMockNetworkConfig().latency).toBe('slow');
  });

  it("hands the app its window's id and link, ignoring empty or odd values", async () => {
    const received: unknown[] = [];
    const Root = withLaunchOptions(props => {
      received.push(props);
      return createElement(Text, null, 'app');
    });

    const screen = await render(
      createElement(Root, {
        windowId: 'window-a',
        initialURL: 'learnx://notice/n1',
      }),
    );
    await screen.rerender(createElement(Root, { windowId: '', initialURL: 7 }));

    expect(received[0]).toEqual({
      windowId: 'window-a',
      initialURL: 'learnx://notice/n1',
    });
    expect(received.at(-1)).toEqual({
      windowId: undefined,
      initialURL: undefined,
    });
  });
});

describe('store report', () => {
  it('is on for true, as a string or a boolean', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(applyLaunchOptions({ storeReport: 'true' }).storeReport).toBe(true);
    expect(applyLaunchOptions({ storeReport: true }).storeReport).toBe(true);
    expect(applyLaunchOptions({ storeReport: 'yes' }).storeReport).toBe(false);
    expect(applyLaunchOptions().storeReport).toBe(false);
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockSettingsGet.mockImplementation(key =>
      key === 'storeReport' ? 'true' : undefined,
    );
    expect(applyLaunchOptions().storeReport).toBe(true);
  });

  it('replaces the app', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const Root = withLaunchOptions(() => createElement(Text, null, 'app'));

    const screen = await render(createElement(Root, { storeReport: 'true' }));

    expect(screen.queryByText('app')).toBeNull();
    expect(screen.getByText('report')).toBeTruthy();
  });
});
