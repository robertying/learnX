// The dark mode script of the notice and assignment web views
// (helpers/preval/darkMode.js, which helpers/html inlines).

const {
  parseColor,
  rgbToHsl,
  darkenForeground,
  darkenBackground,
  darkenBorder,
  luminance,
  hslToString,
  applyDarkMode,
} = require('helpers/preval/darkMode.js');

const lightness = (hsla: string) =>
  Number(/,\s*([\d.]+)%,\s*[\d.]+\)$/.exec(hsla)![1]) / 100;

describe('dark mode colors', () => {
  it('parses computed colors', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('rgb(1, 2)')).toBeNull();
    expect(parseColor('rgb(1, x, 3)')).toBeNull();
  });

  it('converts to HSL', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 1,
      l: 0.5,
      a: 1,
    });
    expect(rgbToHsl({ r: 0, g: 255, b: 0, a: 1 }).h).toBe(120);
    expect(rgbToHsl({ r: 0, g: 0, b: 255, a: 1 }).h).toBe(240);
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

  it('darkens bright highlights enough for light text', () => {
    const base = rgbToHsl(parseColor('rgb(30, 26, 29)'));
    const yellow = darkenBackground(parseColor('rgb(255, 255, 0)'), base);
    const background = rgbToHsl(parseColor('rgb(255, 255, 0)'));
    const text = rgbToHsl(parseColor('rgb(233, 224, 228)'));
    // WCAG contrast of the page text on the adjusted highlight
    const contrast =
      (luminance(text) + 0.05) /
      (luminance({ ...background, l: lightness(yellow) }) + 0.05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    // Still yellow, just dark
    expect(yellow).toMatch(/^hsla\(60, 100%/);
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
    const base = rgbToHsl(parseColor('rgb(30, 26, 29)'));
    // White becomes the page background itself, tint included
    expect(darkenBackground(parseColor('rgb(255, 255, 255)'), base)).toBe(
      hslToString(base),
    );
    expect(
      lightness(darkenBackground(parseColor('rgb(40, 40, 40)'), base)),
    ).toBeCloseTo(0.157, 2);
  });
});

describe('applyDarkMode', () => {
  type Style = Record<string, string>;
  type Element = {
    computed: Style;
    parentElement: Element | null;
    set: Style;
    style: { setProperty: (name: string, value: string) => void };
  };

  /** An element whose computed style is `computed` plus what was set on it. */
  const element = (computed: Style, parentElement: Element | null = null) => {
    const el: Element = {
      computed,
      parentElement,
      set: {},
      style: {
        setProperty: (name, value) => {
          el.set[name] = value;
        },
      },
    };
    return el;
  };

  const page = (children: (root: Element) => Element[]) => {
    const root = element({
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
    });
    const all = children(root);
    return { root: Object.assign(root, { querySelectorAll: () => all }) };
  };

  beforeEach(() => {
    const getComputedStyle = (el: Element) => {
      const style = { ...el.computed };
      for (const [name, value] of Object.entries(el.set)) {
        style[name === 'background-color' ? 'backgroundColor' : name] = value;
      }
      return {
        ...style,
        getPropertyValue: (name: string) => style[name] ?? '',
      };
    };
    Object.assign(window, { getComputedStyle });
  });

  const bordered = (side: string, color: string, style = 'solid') => ({
    [`border-${side}-style`]: style,
    [`border-${side}-width`]: '1px',
    [`border-${side}-color`]: color,
  });

  it('recolors text, backgrounds and borders that are set on an element', () => {
    let text: Element, box: Element;
    const { root } = page(r => {
      text = element({ color: 'rgb(51, 51, 51)' }, r);
      box = element(
        {
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'rgb(255, 255, 255)',
          ...bordered('top', 'rgb(200, 200, 200)'),
        },
        r,
      );
      return [text, box];
    });

    applyDarkMode(root, 'rgb(30, 26, 29)');

    expect(text!.set).toEqual({
      color: darkenForeground(parseColor('rgb(51, 51, 51)')),
    });
    const base = rgbToHsl(parseColor('rgb(30, 26, 29)'));
    expect(box!.set).toEqual({
      'background-color': hslToString(base),
      'border-top-color': darkenBorder(
        parseColor('rgb(200, 200, 200)'),
        base.l,
      ),
    });
  });

  it('leaves inherited text, see-through backgrounds and hidden borders alone', () => {
    let inherited: Element;
    const { root } = page(r => {
      inherited = element(
        {
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'rgba(255, 255, 255, 0)',
          ...bordered('top', 'rgb(200, 200, 200)', 'none'),
          ...bordered('right', 'rgb(0, 0, 0)'),
          ...bordered('bottom', 'transparent'),
          ...bordered('left', 'rgba(0, 0, 0, 0)'),
          'border-right-width': '1px',
        },
        r,
      );
      return [inherited];
    });

    applyDarkMode(root, 'rgb(30, 26, 29)');

    expect(inherited!.set).toEqual({});
    // The root has no parent, so its own text color counts as set
    expect(Object.keys(root.set)).toEqual(['color']);
  });

  it('reads every element before changing any', () => {
    let child: Element;
    const { root } = page(r => {
      const parent = element({ color: 'rgb(51, 51, 51)' }, r);
      child = element({ color: 'rgb(51, 51, 51)' }, parent);
      return [parent, child];
    });

    applyDarkMode(root, 'rgb(30, 26, 29)');

    // Its parent's new color doesn't make its own look set
    expect(child!.set).toEqual({});
  });

  it('takes a dark gray page when the background is not a color', () => {
    let box: Element;
    const { root } = page(r => {
      box = element(
        { color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)' },
        r,
      );
      return [box];
    });

    applyDarkMode(root, '');

    expect(box!.set['background-color']).toBe(
      hslToString({ h: 0, s: 0, l: 0.1, a: 1 }),
    );
  });
});
