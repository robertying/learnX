import type { MaterialColors, StatusTone } from 'theme';

/**
 * The Electron app's palette (Windows, later Linux): Fluent 2's neutral and
 * status tokens with the brand color as the accent, until the app gets its
 * Fluent UI (phase 3 of the plan). Plain `rgb(…)` strings, as on Android, so
 * the theme's color math works on them.
 */
const palette = {
  light: {
    brand: 'rgb(102, 8, 116)',
    onBrand: 'rgb(255, 255, 255)',
    brandContainer: 'rgb(246, 232, 248)',
    // neutralBackground1–3, the selected and hover fills
    background: 'rgb(250, 250, 250)',
    surface: 'rgb(255, 255, 255)',
    groupedBackground: 'rgb(245, 245, 245)',
    selected: 'rgb(235, 235, 235)',
    surfaceVariant: 'rgb(240, 240, 240)',
    // neutralForeground1–3, and a fourth for hints
    foreground1: 'rgb(36, 36, 36)',
    foreground2: 'rgb(66, 66, 66)',
    foreground3: 'rgb(97, 97, 97)',
    foreground4: 'rgb(138, 138, 138)',
    // neutralStrokeAccessible, neutralStroke2
    outline: 'rgb(117, 117, 117)',
    outlineVariant: 'rgb(224, 224, 224)',
    fill: 'rgba(0, 0, 0, 0.06)',
    subtleFill: 'rgba(0, 0, 0, 0.04)',
    // Each status hue's foreground1 and background1
    status: {
      red: ['rgb(177, 14, 28)', 'rgb(253, 243, 244)'],
      orange: ['rgb(188, 75, 9)', 'rgb(255, 249, 245)'],
      yellow: ['rgb(129, 116, 0)', 'rgb(254, 247, 178)'],
      green: ['rgb(14, 112, 14)', 'rgb(241, 250, 241)'],
      blue: ['rgb(17, 94, 163)', 'rgb(235, 243, 252)'],
      grey: ['rgb(97, 97, 97)', 'rgb(240, 240, 240)'],
    },
  },
  dark: {
    brand: 'rgb(197, 92, 214)',
    onBrand: 'rgb(255, 255, 255)',
    brandContainer: 'rgb(64, 28, 70)',
    background: 'rgb(31, 31, 31)',
    surface: 'rgb(41, 41, 41)',
    groupedBackground: 'rgb(20, 20, 20)',
    selected: 'rgb(61, 61, 61)',
    surfaceVariant: 'rgb(56, 56, 56)',
    foreground1: 'rgb(255, 255, 255)',
    foreground2: 'rgb(214, 214, 214)',
    foreground3: 'rgb(173, 173, 173)',
    foreground4: 'rgb(130, 130, 130)',
    outline: 'rgb(140, 140, 140)',
    outlineVariant: 'rgb(82, 82, 82)',
    fill: 'rgba(255, 255, 255, 0.08)',
    subtleFill: 'rgba(255, 255, 255, 0.05)',
    status: {
      red: ['rgb(220, 98, 109)', 'rgb(59, 5, 9)'],
      orange: ['rgb(250, 160, 107)', 'rgb(65, 18, 0)'],
      yellow: ['rgb(254, 238, 102)', 'rgb(60, 52, 0)'],
      green: ['rgb(84, 176, 84)', 'rgb(5, 37, 5)'],
      blue: ['rgb(71, 158, 245)', 'rgb(8, 35, 56)'],
      grey: ['rgb(173, 173, 173)', 'rgb(61, 61, 61)'],
    },
  },
} as const;

const tones = (f: (tone: StatusTone) => string) => ({
  red: f('red'),
  orange: f('orange'),
  yellow: f('yellow'),
  green: f('green'),
  blue: f('blue'),
  grey: f('grey'),
});

/** The theme's color roles in the Electron app. */
export const buildElectronColors = (dark: boolean): MaterialColors => {
  const p = dark ? palette.dark : palette.light;
  const status = tones(tone => p.status[tone][0]);
  const statusBackground = tones(tone => p.status[tone][1]);
  // White on the solid hues in light mode (yellow takes black); in dark mode
  // the hues are light, and take the dark backgrounds as their text.
  const onStatus = dark
    ? statusBackground
    : { ...tones(() => 'rgb(255, 255, 255)'), yellow: 'rgb(0, 0, 0)' };
  return {
    primary: p.brand,
    onPrimary: p.onBrand,
    primaryContainer: p.brandContainer,
    onPrimaryContainer: p.brand,
    secondaryContainer: p.selected,
    onSecondaryContainer: p.foreground1,
    error: status.red,
    onError: onStatus.red,
    background: p.background,
    surface: p.background,
    surfaceVariant: p.surfaceVariant,
    surfaceContainer: p.surface,
    onSurface: p.foreground1,
    onSurfaceVariant: p.foreground3,
    outline: p.outline,
    outlineVariant: p.outlineVariant,
    surfaceDisabled: p.fill,
    onSurfaceDisabled: p.foreground4,
    onSurfaceHigh: p.foreground1,
    onSurfaceMedium: p.foreground3,
    text: p.foreground1,
    card: p.surface,
    border: p.outlineVariant,
    notification: status.red,
    status,
    onStatus,
    statusContainer: statusBackground,
    onStatusContainer: status,
  };
};

/**
 * Apple's system colors that the iOS components name (`PlatformColor`), as
 * the palette's colors, for the stand-in `PlatformColor` (web/systemColors).
 */
export const electronSystemColors = (dark: boolean): Record<string, string> => {
  const p = dark ? palette.dark : palette.light;
  return {
    label: p.foreground1,
    secondaryLabel: p.foreground3,
    tertiaryLabel: p.foreground4,
    quaternaryLabel: p.outlineVariant,
    placeholderText: p.foreground4,
    systemBackground: p.background,
    secondarySystemBackground: p.surface,
    tertiarySystemBackground: p.surface,
    systemGroupedBackground: p.groupedBackground,
    secondarySystemGroupedBackground: p.surface,
    tertiarySystemFill: p.fill,
    quaternarySystemFill: p.subtleFill,
    separator: p.outlineVariant,
    opaqueSeparator: p.outlineVariant,
    link: p.brand,
    systemGray: p.status.grey[0],
    systemGray5: p.surfaceVariant,
    systemRed: p.status.red[0],
    systemOrange: p.status.orange[0],
    systemYellow: p.status.yellow[0],
    systemGreen: p.status.green[0],
    systemBlue: p.status.blue[0],
    systemPurple: p.brand,
  };
};
