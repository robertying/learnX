const script: string = require('helpers/preval/ssoAlerts.preval.js');
const { runInNewContext } = require('vm') as {
  runInNewContext: (code: string, context: object) => unknown;
};

/** Runs the script at `url` and returns the page's `window` after it. */
const runAt = (url: string, { webView = true } = {}) => {
  const alert = jest.fn(() => 'shown');
  const postMessage = jest.fn();
  const window: Record<string, any> = {
    location: new URL(url),
    alert,
    ReactNativeWebView: webView ? { postMessage } : undefined,
  };
  const result = runInNewContext(script, { window });
  return { result, window, alert, postMessage };
};

const LOGIN = 'https://id.tsinghua.edu.cn/do/off/ui/auth/login/form/x/0';

describe('ssoAlerts', () => {
  it.each([
    'The number of trusted browser has reached the limit.',
    '信任浏览器数量已达到上限',
  ])('hands "%s" to learnX in place of the alert', text => {
    const { result, window, alert, postMessage } = runAt(LOGIN);
    expect(result).toBe(true);
    expect(window.alert(text)).toBeUndefined();
    expect(alert).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'TRUSTED_BROWSER_LIMIT' }),
    );
  });

  it('shows every other alert as the page meant it to', () => {
    const { window, alert, postMessage } = runAt(LOGIN);
    expect(window.alert('Wrong password')).toBe('shown');
    expect(window.alert()).toBe('shown');
    expect(alert).toHaveBeenCalledWith('Wrong password');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('shows the alert itself outside learnX', () => {
    const { window, alert } = runAt(LOGIN, { webView: false });
    window.alert('信任浏览器数量已达到上限');
    expect(alert).toHaveBeenCalledWith('信任浏览器数量已达到上限');
  });

  it.each([
    'https://example.com/login',
    'https://tsinghua.edu.cn.example.com/',
    'http://id.tsinghua.edu.cn/',
  ])('leaves %s alone', url => {
    const { result, window, alert } = runAt(url);
    expect(result).toBe(true);
    expect(window.alert).toBe(alert);
  });
});
