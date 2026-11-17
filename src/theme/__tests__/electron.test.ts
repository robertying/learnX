import { buildElectronColors, electronSystemColors } from 'theme/electron';

it.each([false, true])('has every color role (dark: %s)', dark => {
  const colors = buildElectronColors(dark);
  for (const value of Object.values(colors).flatMap(v =>
    typeof v === 'string' ? [v] : Object.values(v),
  )) {
    expect(value).toMatch(/^rgba?\(/);
  }
  expect(colors.primary).toBe(dark ? 'rgb(206, 118, 221)' : 'rgb(102, 8, 116)');
});

it('puts dark text on the light status hues of dark mode', () => {
  const light = buildElectronColors(false);
  const dark = buildElectronColors(true);
  expect(light.onStatus.red).toBe('rgb(255, 255, 255)');
  expect(light.onStatus.yellow).toBe('rgb(0, 0, 0)');
  expect(dark.onStatus.red).toBe(dark.statusContainer.red);
});

it('names a color for every system color the components use', () => {
  for (const dark of [false, true]) {
    const colors = electronSystemColors(dark);
    for (const name of [
      'label',
      'secondaryLabel',
      'tertiaryLabel',
      'systemBackground',
      'secondarySystemBackground',
      'systemGroupedBackground',
      'tertiarySystemFill',
      'quaternarySystemFill',
      'opaqueSeparator',
      'systemGray',
      'systemGray5',
      'systemRed',
      'systemOrange',
      'systemYellow',
      'systemGreen',
      'systemBlue',
    ]) {
      expect(colors[name]).toBeDefined();
    }
  }
});
