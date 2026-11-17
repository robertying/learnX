// The theme as the Electron app's web build has it: Metro (and this Jest
// project) pick theme/colors.web.ts there.
import { BrandDarkTheme, BrandLightTheme } from 'theme';
import { buildElectronColors } from 'theme/electron';

it('is the Electron app’s palette', () => {
  expect(BrandLightTheme.colors).toEqual(buildElectronColors(false));
  expect(BrandDarkTheme.colors).toEqual(buildElectronColors(true));
});
