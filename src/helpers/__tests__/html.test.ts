import { Platform } from 'react-native';
import { getWebViewTemplate, hasMath } from 'helpers/html';
import { getScriptNonce } from 'helpers/webContent';

const darkColors = {
  dark: true,
  backgroundColor: 'rgb(30, 26, 29)',
  textColor: 'rgb(233, 224, 228)',
};

describe('hasMath', () => {
  it.each([
    ['$$x^2$$', true],
    ['\\(x\\)', true],
    ['\\[x\\]', true],
    ['\\begin{equation}x\\end{equation}', true],
    ['<p>Due on Friday, costs $5</p>', false],
    ['<p>plain text</p>', false],
  ])('%s → %s', (content, expected) => {
    expect(hasMath(content)).toBe(expected);
  });
});

describe('getWebViewTemplate', () => {
  it('leaves out KaTeX when there is no math', () => {
    const html = getWebViewTemplate('<p>hello</p>', 'token');
    expect(html).not.toContain('renderMathInElement');
    expect(html).not.toContain('.katex');
    expect(html.length).toBeLessThan(5_000);
  });

  it("fits images to the width in their own shape, over the editor's sizes", () => {
    const html = getWebViewTemplate(
      '<p><img style="height:380px" /></p>',
      'token',
    );
    expect(html).toMatch(
      /img \{\s*max-width: 100% !important;\s*height: auto !important;/,
    );
  });

  it('inlines KaTeX when there is math', () => {
    const html = getWebViewTemplate('<p>$$x^2$$</p>', 'token');
    expect(html).toContain('renderMathInElement');
    expect(html).toContain('.katex');
  });

  it('only adds the dark mode script and colors in dark mode', () => {
    const light = getWebViewTemplate('<p>hello</p>', 'token');
    expect(light).not.toContain('applyDarkMode');
    expect(light).not.toContain('color-scheme');

    const dark = getWebViewTemplate('<p>hello</p>', 'token', darkColors);
    expect(dark).toContain('color-scheme: dark');
    expect(dark).toContain('background-color: rgb(30, 26, 29)');
    expect(dark).toContain('color: rgb(233, 224, 228)');
    expect(dark).toContain(
      'applyDarkMode(document.querySelector("#root"), "rgb(30, 26, 29)")',
    );
    expect(dark.length).toBeLessThan(10_000);
  });

  it('tells screen readers the language of the content', () => {
    expect(getWebViewTemplate('<p>Midterm moved</p>', 'token')).toContain(
      '<html lang="en">',
    );
    expect(getWebViewTemplate('<p>期中考试改期</p>', 'token')).toContain(
      '<html lang="zh-Hans">',
    );
  });

  it('replaces \\mbox, which KaTeX does not support', () => {
    expect(getWebViewTemplate('$$\\mbox{a}$$', 'token')).toContain(
      '$$\\text{a}$$',
    );
  });

  it('adds the CSRF token to the links in the page', () => {
    const html = getWebViewTemplate('<a href="/b/file">file</a>', 'token');
    expect(html).toContain('function addCSRFTokenToLinks');
    expect(html).toContain(
      'addCSRFTokenToLinks(\n            document,\n            "token"',
    );
  });
});

describe('the page policy and link taps', () => {
  it("runs only the template's scripts and submits no forms", () => {
    const html = getWebViewTemplate(
      '<form action="https://x"></form>',
      'token',
    );
    expect(html).toContain(
      `script-src 'nonce-${getScriptNonce()}'; form-action 'none'`,
    );
  });

  it.each([
    ['ios', 'font: -apple-system-body;'],
    ['android', undefined],
    ['web', 'font-family: system-ui, sans-serif;'],
  ] as const)('sets the body font on %s', (os, font) => {
    jest.replaceProperty(Platform, 'OS', os);
    const html = getWebViewTemplate('x', 'token');
    for (const candidate of [
      'font: -apple-system-body;',
      'font-family: system-ui, sans-serif;',
    ]) {
      expect(html.includes(candidate)).toBe(candidate === font);
    }
  });

  it.each(['android', 'web'] as const)(
    'reports link taps with the nonce on %s, not on iOS',
    os => {
      expect(
        getWebViewTemplate('<a href="https://x">x</a>', 'token'),
      ).not.toContain('reportLinkTaps');
      jest.replaceProperty(Platform, 'OS', os);
      const html = getWebViewTemplate('<a href="https://x">x</a>', 'token');
      expect(html).toContain('function reportLinkTaps');
      expect(html).toContain(`"${getScriptNonce()}"`);
    },
  );
});
