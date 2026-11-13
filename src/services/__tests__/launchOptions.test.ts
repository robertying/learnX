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
  getLiveLogin,
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

it('ignores missing and unknown values', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  applyLaunchOptions();
  applyLaunchOptions({ mockLatency: 'instant' });
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
