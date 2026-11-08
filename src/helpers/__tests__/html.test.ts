import { getWebViewTemplate, hasMath } from 'helpers/html';

const {
  parseColor,
  rgbToHsl,
  darkenForeground,
  darkenBackground,
  darkenBorder,
} = require('helpers/preval/darkMode.js');

jest.mock('data/source', () => ({
  dataSource: { getCSRFToken: () => 'token' },
}));

const darkColors = {
  dark: true,
  backgroundColor: 'rgb(30, 26, 29)',
  textColor: 'rgb(233, 224, 228)',
};

const lightness = (hsla: string) =>
  Number(/,\s*([\d.]+)%,\s*[\d.]+\)$/.exec(hsla)![1]) / 100;

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
    const html = getWebViewTemplate('<p>hello</p>');
    expect(html).not.toContain('renderMathInElement');
    expect(html).not.toContain('.katex');
    expect(html.length).toBeLessThan(5_000);
  });

  it('inlines KaTeX when there is math', () => {
    const html = getWebViewTemplate('<p>$$x^2$$</p>');
    expect(html).toContain('renderMathInElement');
    expect(html).toContain('.katex');
  });

  it('only adds the dark mode script and colors in dark mode', () => {
    const light = getWebViewTemplate('<p>hello</p>');
    expect(light).not.toContain('applyDarkMode');
    expect(light).not.toContain('color-scheme');

    const dark = getWebViewTemplate('<p>hello</p>', darkColors);
    expect(dark).toContain('color-scheme: dark');
    expect(dark).toContain('background-color: rgb(30, 26, 29)');
    expect(dark).toContain('color: rgb(233, 224, 228)');
    expect(dark).toContain(
      'applyDarkMode(document.querySelector("#root"), "rgb(30, 26, 29)")',
    );
    expect(dark).not.toContain('DarkReader');
    expect(dark.length).toBeLessThan(10_000);
  });

  it('replaces \\mbox, which KaTeX does not support', () => {
    expect(getWebViewTemplate('$$\\mbox{a}$$')).toContain('$$\\text{a}$$');
  });
});

describe('dark mode colors', () => {
  it('parses computed colors', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('')).toBeNull();
  });

  it('converts to HSL', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 1,
      l: 0.5,
      a: 1,
    });
    expect(rgbToHsl({ r: 255, g: 255, b: 255, a: 1 }).l).toBe(1);
  });

  it('makes dark text light and keeps light text', () => {
    expect(lightness(darkenForeground(parseColor('rgb(0, 0, 0)')))).toBe(0.9);
    expect(
      lightness(darkenForeground(parseColor('rgb(51, 51, 51)'))),
    ).toBeCloseTo(0.8, 2);
    expect(
      lightness(darkenForeground(parseColor('rgb(200, 200, 200)'))),
    ).toBeCloseTo(0.784, 2);
  });

  it('keeps the hue and alpha of colored text', () => {
    expect(darkenForeground(parseColor('rgba(0, 0, 128, 0.5)'))).toBe(
      'hsla(240, 100%, 79.9%, 0.5)',
    );
  });

  it('lightens saturated colors that look dark', () => {
    // Pure blue is 50% lightness but too dark to read on a dark background
    expect(
      lightness(darkenForeground(parseColor('rgb(0, 0, 255)'))),
    ).toBeGreaterThanOrEqual(0.75);
  });

  it('flips border lightness', () => {
    const base = 0.11;
    expect(
      lightness(darkenBorder(parseColor('rgb(204, 204, 204)'), base)),
    ).toBeCloseTo(0.21, 2);
    expect(lightness(darkenBorder(parseColor('rgb(0, 0, 0)'), base))).toBe(0.9);
    expect(
      lightness(darkenBorder(parseColor('rgb(255, 255, 255)'), base)),
    ).toBeCloseTo(0.21, 2);
  });

  it('maps white backgrounds onto the page background and keeps dark ones', () => {
    const base = rgbToHsl(parseColor('rgb(30, 26, 29)')).l;
    expect(
      lightness(darkenBackground(parseColor('rgb(255, 255, 255)'), base)),
    ).toBeCloseTo(base, 2);
    expect(
      lightness(darkenBackground(parseColor('rgb(255, 255, 0)'), base)),
    ).toBeCloseTo(base + 0.25, 2);
    expect(
      lightness(darkenBackground(parseColor('rgb(40, 40, 40)'), base)),
    ).toBeCloseTo(0.157, 2);
  });
});
