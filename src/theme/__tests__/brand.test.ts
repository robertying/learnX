// The brand color lives in src/theme, but native resources and the widgets
// (which can't import it) keep their own copies. Keep them in step.
import { BrandDarkTheme, BrandLightTheme, brandColors } from 'theme';

// The app's tsconfig has no Node types; Jest runs in Node from the repo root.
const { readFileSync } = require('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const read = (path: string) => readFileSync(path, 'utf8');

const toRgb = (hex: string) =>
  `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

const androidColor = (path: string, name: string) =>
  read(path).match(new RegExp(`name="${name}">(#[0-9A-F]{6})<`, 'i'))?.[1];

const iosThemeColor = (dark: boolean) => {
  const { colors } = JSON.parse(
    read('ios/learnX/Assets.xcassets/ThemeColor.colorset/Contents.json'),
  ) as {
    colors: {
      appearances?: unknown[];
      color: { components: Record<'red' | 'green' | 'blue', string> };
    }[];
  };
  const { red, green, blue } = colors.find(c => !!c.appearances === dark)!.color
    .components;
  return `#${[red, green, blue].map(c => c.slice(2)).join('')}`;
};

describe('brand color', () => {
  it('is the JS theme primary', () => {
    expect(BrandLightTheme.colors.primary).toBe(toRgb(brandColors.light));
    expect(BrandDarkTheme.colors.primary).toBe(toRgb(brandColors.dark));
  });

  it('matches the iOS ThemeColor asset', () => {
    expect(iosThemeColor(false)).toBe(brandColors.light);
    expect(iosThemeColor(true)).toBe(brandColors.dark);
  });

  it("matches Android's colors.xml", () => {
    const light = 'android/app/src/main/res/values/colors.xml';
    const dark = 'android/app/src/main/res/values-night/colors.xml';
    expect(androidColor(light, 'seed')).toBe(brandColors.light);
    expect(androidColor(light, 'md_theme_primary')).toBe(brandColors.light);
    expect(androidColor(dark, 'md_theme_primary')).toBe(brandColors.dark);
  });

  it("colors the logo mark on Android's splash and login screens", () => {
    const fill = (path: string) =>
      read(path).match(/android:fillColor="#FF([0-9A-F]{6})"/i)?.[1];
    const res = 'android/app/src/main/res';
    expect(`#${fill(`${res}/drawable/splash_screen_icon.xml`)}`).toBe(
      brandColors.light,
    );
    expect(`#${fill(`${res}/drawable-night/splash_screen_icon.xml`)}`).toBe(
      brandColors.dark,
    );
  });

  it('is what the widgets use', () => {
    for (const widget of ['DeadlinesIOS', 'DeadlinesAndroid']) {
      const source = read(`src/widgets/${widget}.tsx`);
      expect(source).toContain(`'${brandColors.light}'`);
      expect(source).toContain(`'${brandColors.dark}'`);
    }
  });
});
