// Runs inside the notice and assignment web views (inlined as a string by
// darkMode.preval.js), so it is plain ES2017 with no imports. It replaces
// Dark Reader, which was ~360 KB of script inlined into every page: content
// from the course site is short rich-text HTML whose colors come from inline
// styles, <font color> and bgcolor, so adjusting the colors that differ from
// what an element inherits is enough.

/** Parses `rgb(...)`/`rgba(...)` from getComputedStyle. */
function parseColor(value) {
  const match = /^rgba?\(([^)]+)\)$/.exec(value || '');
  if (!match) {
    return null;
  }
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    return null;
  }
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? parts[3] : 1,
  };
}

function rgbToHsl({ r, g, b, a }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l, a };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l, a };
}

function hslToString({ h, s, l, a }) {
  const pct = n => `${Math.round(n * 1000) / 10}%`;
  return `hsla(${Math.round(h)}, ${pct(s)}, ${pct(l)}, ${a})`;
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** WCAG relative luminance of an HSL color. */
function luminance({ h, s, l }) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = n => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

/**
 * Text colors: dark ones become light, light ones stay. Saturated colors such
 * as pure blue look dark at any HSL lightness, so they are lightened further
 * until they are readable on a dark background.
 */
function darkenForeground(color) {
  const hsl = rgbToHsl(color);
  let l = hsl.l < 0.6 ? clamp(1 - hsl.l, 0.6, 0.9) : hsl.l;
  while (l < 0.9 && luminance({ ...hsl, l }) < 0.3) {
    l = Math.min(0.9, l + 0.05);
  }
  return hslToString({ ...hsl, l });
}

/**
 * Border colors: lightness flips, so faint light borders stay faint and
 * strong dark ones stay strong.
 */
function darkenBorder(color, baseLightness) {
  const hsl = rgbToHsl(color);
  return hslToString({ ...hsl, l: clamp(1 - hsl.l, baseLightness + 0.1, 0.9) });
}

/**
 * Background colors: light ones become dark, with white mapping onto the page
 * background so white boxes blend in; dark ones stay.
 */
function darkenBackground(color, baseLightness) {
  const hsl = rgbToHsl(color);
  const l = Math.min(hsl.l, baseLightness + (1 - hsl.l) * 0.5);
  return hslToString({ ...hsl, l });
}

const borderSides = ['top', 'right', 'bottom', 'left'];

function applyDarkMode(root, backgroundColor) {
  const base = parseColor(backgroundColor);
  const baseLightness = base ? rgbToHsl(base).l : 0.1;

  // Read everything first, so that one change does not show up in the
  // computed style of the elements after it
  const elements = [root, ...root.querySelectorAll('*')];
  const reads = elements.map(element => {
    const style = window.getComputedStyle(element);
    const parentColor = element.parentElement
      ? window.getComputedStyle(element.parentElement).color
      : null;
    return {
      element,
      color: style.color !== parentColor ? style.color : null,
      backgroundColor: style.backgroundColor,
      borders: borderSides
        .filter(
          side =>
            style.getPropertyValue(`border-${side}-style`) !== 'none' &&
            parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
            style.getPropertyValue(`border-${side}-color`) !== style.color,
        )
        .map(side => [side, style.getPropertyValue(`border-${side}-color`)]),
    };
  });

  for (const { element, color, backgroundColor: bg, borders } of reads) {
    const fg = parseColor(color);
    if (fg) {
      element.style.setProperty('color', darkenForeground(fg), 'important');
    }
    const background = parseColor(bg);
    if (background && background.a > 0) {
      element.style.setProperty(
        'background-color',
        darkenBackground(background, baseLightness),
        'important',
      );
    }
    for (const [side, value] of borders) {
      const border = parseColor(value);
      if (border && border.a > 0) {
        element.style.setProperty(
          `border-${side}-color`,
          darkenBorder(border, baseLightness),
          'important',
        );
      }
    }
  }
}

if (typeof module === 'object' && module.exports) {
  module.exports = {
    parseColor,
    rgbToHsl,
    darkenForeground,
    darkenBackground,
    darkenBorder,
    applyDarkMode,
  };
}
