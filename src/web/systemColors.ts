import { electronSystemColors } from 'theme/electron';

/**
 * Apple's system colors and dynamic colors in the Electron app, where React
 * Native Web has neither: each becomes a CSS variable that follows the
 * system's light or dark appearance, which React Native Web passes through
 * as a color.
 */

let styleSheet: CSSStyleSheet | null = null;
const declared = new Set<string>();

/** The variables' style sheet, made on first use. */
const sheet = () => {
  if (!styleSheet) {
    const element = document.createElement('style');
    element.id = 'learnx-system-colors';
    document.head.append(element);
    styleSheet = element.sheet!;
    // Rule 0 holds the light values, rule 1 the dark ones.
    styleSheet.insertRule(':root {}', 0);
    styleSheet.insertRule(
      '@media (prefers-color-scheme: dark) { :root {} }',
      1,
    );
  }
  return styleSheet;
};

const declare = (name: string, light: string, dark: string) => {
  const variable = `--learnx-${name}`;
  if (!declared.has(variable)) {
    declared.add(variable);
    const rules = sheet().cssRules;
    (rules[0] as CSSStyleRule).style.setProperty(variable, light);
    ((rules[1] as CSSMediaRule).cssRules[0] as CSSStyleRule).style.setProperty(
      variable,
      dark,
    );
  }
  return `var(${variable})`;
};

const light = electronSystemColors(false);
const dark = electronSystemColors(true);

/** An Apple system color by its UIKit name; unknown names are the label's. */
export const PlatformColor = (...names: string[]) => {
  const name = names.find(n => n in light) ?? 'label';
  return declare(name, light[name], dark[name]);
};

let dynamicCount = 0;
const dynamicColors = new Map<string, string>();

/** A color with a value for each appearance. */
export const DynamicColorIOS = (colors: { light: string; dark: string }) => {
  const key = `${colors.light} ${colors.dark}`;
  let color = dynamicColors.get(key);
  if (!color) {
    color = declare(`dynamic-${++dynamicCount}`, colors.light, colors.dark);
    dynamicColors.set(key, color);
  }
  return color;
};

/** Forgets the variables made so far (tests). */
export const resetSystemColors = () => {
  styleSheet?.ownerNode?.remove();
  styleSheet = null;
  declared.clear();
  dynamicColors.clear();
  dynamicCount = 0;
};
