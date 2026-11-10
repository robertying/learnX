import Crashlytics from 'modules/crashlytics';
import { useCredentialsStore } from 'data/credentials';
// The fixture helpers/env is mocked with (jest/setup.ts), typed as strings.
import env from '../../../jest/mocks/env';
import {
  installGlobalErrorHandler,
  parseStack,
  recordError,
  trackScreen,
} from 'helpers/crashReporting';

jest.mock('modules/crashlytics', () => ({
  __esModule: true,
  default: { recordError: jest.fn(), log: jest.fn(), setCustomKey: jest.fn() },
}));

const native = jest.mocked(Crashlytics!);

const setUsername = (username: string) =>
  useCredentialsStore.setState({
    credentials: {
      username,
      password: 'password',
      fingerPrint: 'fp',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

beforeEach(() => {
  (globalThis as any).__DEV__ = false;
  setUsername('2020000000');
});

afterAll(() => {
  (globalThis as any).__DEV__ = true;
});

describe('parseStack', () => {
  it('parses Hermes release frames', () => {
    const stack = [
      'TypeError: undefined is not a function',
      '    at onPress (address at index.android.bundle:1:123456)',
      '    at anonymous (address at /data/app/main.jsbundle:1:42)',
      '    at apply (native)',
      '    at /private/var/main.jsbundle:1:7',
    ].join('\n');

    expect(parseStack(stack)).toEqual([
      {
        symbol: 'onPress',
        file: 'index.android.bundle',
        line: 1,
        column: 123456,
      },
      { symbol: 'anonymous', file: 'main.jsbundle', line: 1, column: 42 },
      { symbol: '<anonymous>', file: 'main.jsbundle', line: 1, column: 7 },
    ]);
  });

  it('drops the Metro URL query and path in debug frames', () => {
    expect(
      parseStack(
        '    at Foo.bar [as baz] (http://localhost:8081/index.bundle//&platform=ios&dev=true:120:15)',
      ),
    ).toEqual([
      {
        symbol: 'Foo.bar [as baz]',
        file: 'index.bundle',
        line: 120,
        column: 15,
      },
    ]);
  });

  it('returns no frames without a stack', () => {
    expect(parseStack(undefined)).toEqual([]);
  });
});

describe('recordError', () => {
  it('sends the name, message, frames and logs', () => {
    const error = new TypeError('boom');
    error.stack = 'TypeError: boom\n    at f (address at main.jsbundle:1:2)';

    recordError(error, 'component stack');

    expect(native.log).toHaveBeenCalledWith('component stack');
    expect(native.recordError).toHaveBeenCalledWith('TypeError', 'boom', [
      { symbol: 'f', file: 'main.jsbundle', line: 1, column: 2 },
    ]);
  });

  it('wraps values that are not errors, without their values', () => {
    recordError({ code: 1, name: 'someone' });

    expect(native.recordError).toHaveBeenCalledWith(
      'NonError',
      '{code, name}',
      expect.any(Array),
    );
  });

  it('sends only the reason of a thu-learn-lib error', () => {
    recordError({ reason: 'invalid response', extra: { name: 'someone' } });

    expect(native.recordError).toHaveBeenCalledWith(
      'ApiError',
      'invalid response',
      expect.any(Array),
    );
  });

  it('leaves URL queries out of the message', () => {
    recordError(
      new Error('GET https://learn.tsinghua.edu.cn/b/x?_csrf=secret#a failed'),
    );

    expect(native.recordError).toHaveBeenCalledWith(
      'Error',
      'GET https://learn.tsinghua.edu.cn/b/x failed',
      expect.any(Array),
    );
  });

  it('skips debug builds and the mock accounts', () => {
    (globalThis as any).__DEV__ = true;
    recordError(new Error('dev'));

    (globalThis as any).__DEV__ = false;
    setUsername(env.DUMMY_USERNAME);
    recordError(new Error('mock'));

    expect(native.recordError).not.toHaveBeenCalled();
  });

  it('never throws', () => {
    native.recordError.mockImplementationOnce(() => {
      throw new Error('native');
    });

    expect(() => recordError(new Error('boom'))).not.toThrow();
  });
});

describe('installGlobalErrorHandler', () => {
  it('reports before the default handler and marks fatal errors', () => {
    const defaultHandler = jest.fn();
    let handler: (error: unknown, isFatal?: boolean) => void = () => {};
    (globalThis as any).ErrorUtils = {
      getGlobalHandler: () => defaultHandler,
      setGlobalHandler: (h: typeof handler) => {
        handler = h;
      },
    };

    installGlobalErrorHandler();
    expect(native.setCustomKey).toHaveBeenCalledWith('js_fatal', 'false');

    const error = new Error('fatal');
    handler(error, true);

    expect(native.setCustomKey).toHaveBeenLastCalledWith('js_fatal', 'true');
    expect(native.recordError).toHaveBeenCalledWith(
      'Error',
      'fatal',
      expect.any(Array),
    );
    expect(native.recordError.mock.invocationCallOrder[0]).toBeLessThan(
      defaultHandler.mock.invocationCallOrder[0],
    );
    expect(defaultHandler).toHaveBeenCalledWith(error, true);
  });
});

describe('trackScreen', () => {
  it('sets the deepest focused route', () => {
    trackScreen({
      index: 1,
      routes: [
        { key: 'a', name: 'MainTab' },
        {
          key: 'b',
          name: 'SearchStack',
          state: { routes: [{ key: 'c', name: 'Search' }] },
        },
      ],
    } as any);

    expect(native.setCustomKey).toHaveBeenCalledWith('screen', 'Search');
  });
});
