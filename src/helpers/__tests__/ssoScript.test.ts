import { fillSSOScript } from 'helpers/ssoScript';

const script: string = require('helpers/preval/sso.preval.js');
const { runInNewContext } = require('vm') as {
  runInNewContext: (code: string, context: object) => unknown;
};

const values = {
  username: "o'brien\\",
  password: 'p\'a"s`s${x}\\n</script>',
  deviceName: 'iPhone,learnX/18.0.3',
  fingerPrint: 'abc123',
};

/** Runs the filled script with only `window` defined, at the given page. */
const runAt = (url: string) => {
  const location = new URL(url);
  const document = {
    querySelector: jest.fn(() => null),
    documentElement: {},
  };
  const xhr = function () {} as unknown as { prototype: object };
  xhr.prototype = { open: jest.fn(), send: jest.fn() };
  const observe = jest.fn();
  const result = runInNewContext(fillSSOScript(script, values), {
    window: { location },
    document,
    XMLHttpRequest: xhr,
    MutationObserver: class {
      observe = observe;
      disconnect = jest.fn();
    },
    setInterval: jest.fn(),
  });
  return { result, document, xhr, observe };
};

describe('fillSSOScript', () => {
  it('fills every placeholder', () => {
    expect(fillSSOScript(script, values)).not.toMatch(
      /\$\{(username|password|deviceName|fingerPrint)\}/,
    );
  });

  it('keeps quotes and backslashes in the values as they are', () => {
    const filled = fillSSOScript(script, values);
    expect(filled).toContain(`= ${JSON.stringify(values.password)};`);
    expect(filled).not.toContain("'${");
    expect(filled).toContain(`= ${JSON.stringify(values.username)};`);
  });

  it('runs on the Tsinghua login page', () => {
    const { result, document } = runAt(
      'https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/x/0',
    );
    expect(result).toBe(true);
    expect(document.querySelector).toHaveBeenCalled();
  });

  it.each([
    'https://example.com/login',
    'https://tsinghua.edu.cn.example.com/',
    'http://id.tsinghua.edu.cn/',
  ])('does nothing on %s', url => {
    const { result, document, observe } = runAt(url);
    expect(result).toBe(true);
    expect(document.querySelector).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });
});
