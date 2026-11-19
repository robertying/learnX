// The theme as the Electron app's web build has it: Metro (and this Jest
// project) pick theme/colors.web.ts there.
import { BrandDarkTheme, BrandLightTheme, webContentColors } from 'theme';
import { buildElectronColors } from 'theme/electron';

it('is the Electron app’s palette', () => {
  expect(BrandLightTheme.colors).toEqual(buildElectronColors(false));
  expect(BrandDarkTheme.colors).toEqual(buildElectronColors(true));
});

it('gives course content Fluent’s text color and the brand ramp’s links', () => {
  expect(webContentColors(BrandDarkTheme)).toEqual({
    textColor: 'rgb(255, 255, 255)',
    linkColor: 'rgb(206, 118, 221)',
  });
  expect(webContentColors(BrandLightTheme)).toEqual({
    textColor: 'rgb(36, 36, 36)',
    linkColor: 'rgb(102, 8, 116)',
  });
});
