// The Electron app's palette (theme/electron): Fluent's neutrals and the
// brand ramp, whatever builders the theme passes in for the phones.
import type { buildPlatformColors as Native } from './colors';
import { buildElectronColors } from './electron';

export const buildPlatformColors: typeof Native = dark =>
  buildElectronColors(dark) as never;
