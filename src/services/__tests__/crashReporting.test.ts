import Crashlytics from 'modules/crashlytics';
import { useCredentialsStore } from 'data/credentials';
// The fixture helpers/env is mocked with (jest/setup.ts), typed as strings.
import env from '../../../jest/mocks/env';
import {
  installGlobalErrorHandler,
  installRejectionTracker,
  parseStack,
  recordError,
  setCustomKey,
  trackScreen,
} from 'services/crashReporting';

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

  it('sends a thrown string as it is, and names a nameless error', () => {
    recordError('plain text');
    expect(native.recordError).toHaveBeenCalledWith(
      'NonError',
      'plain text',
      expect.any(Array),
    );

    const nameless = new Error('boom');
    nameless.name = '';
    recordError(nameless);
    expect(native.recordError).toHaveBeenLastCalledWith(
      'Error',
      'boom',
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

  it('skips debug builds and the mock account', () => {
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

    // A caught error isn't marked fatal.
    native.setCustomKey.mockClear();
    handler(new Error('caught'), false);
    expect(native.setCustomKey).not.toHaveBeenCalled();

    // Installing again doesn't wrap the handler twice.
    const setGlobalHandler = jest.fn();
    (globalThis as any).ErrorUtils.setGlobalHandler = setGlobalHandler;
    installGlobalErrorHandler();
    expect(setGlobalHandler).not.toHaveBeenCalled();
  });
});

describe('setCustomKey', () => {
  it('skips debug builds and never throws', () => {
    (globalThis as any).__DEV__ = true;
    setCustomKey('a', 'b');
    expect(native.setCustomKey).not.toHaveBeenCalled();

    (globalThis as any).__DEV__ = false;
    native.setCustomKey.mockImplementationOnce(() => {
      throw new Error('native');
    });
    expect(() => setCustomKey('a', 'b')).not.toThrow();
  });
});

describe('installRejectionTracker', () => {
  type Tracker = {
    onUnhandled: (id: number, rejection: unknown) => void;
  };
  const enable = jest.fn<void, [Tracker]>();

  afterAll(() => {
    delete (globalThis as any).HermesInternal;
  });

  it('only tracks in release builds on Hermes', () => {
    (globalThis as any).__DEV__ = true;
    (globalThis as any).HermesInternal = {
      enablePromiseRejectionTracker: enable,
    };
    installRejectionTracker();
    expect(enable).not.toHaveBeenCalled();

    (globalThis as any).__DEV__ = false;
    delete (globalThis as any).HermesInternal;
    installRejectionTracker();
    expect(enable).not.toHaveBeenCalled();
  });

  it('reports each distinct rejection once, at most ten', () => {
    (globalThis as any).HermesInternal = {
      enablePromiseRejectionTracker: enable,
    };
    installRejectionTracker();
    installRejectionTracker();
    expect(enable).toHaveBeenCalledTimes(1);
    const { onUnhandled } = enable.mock.calls[0][0];

    onUnhandled(1, new Error('a'));
    onUnhandled(2, new Error('a'));
    expect(native.recordError).toHaveBeenCalledTimes(1);
    expect(native.log).toHaveBeenCalledWith('Unhandled promise rejection');

    // Values that aren't errors, kept without their contents.
    onUnhandled(3, null);
    onUnhandled(4, 42);
    expect(
      native.recordError.mock.calls.slice(1).map(c => c.slice(0, 2)),
    ).toEqual([
      ['NonError', 'null'],
      ['NonError', '42'],
    ]);

    for (let i = 0; i < 20; i++) {
      onUnhandled(10 + i, new Error(`loop ${i}`));
    }
    expect(native.recordError).toHaveBeenCalledTimes(10);
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

  it('sets nothing before the first screen', () => {
    trackScreen(undefined);
    expect(native.setCustomKey).not.toHaveBeenCalled();
  });
});
