import {
  DynamicColorIOS,
  PlatformColor,
  resetSystemColors,
} from 'web/systemColors';
import { electronSystemColors } from 'theme/electron';

/** Just enough of a document for the style sheet the colors go into. */
const fakeDocument = () => {
  const styleRule = () => {
    const values: Record<string, string> = {};
    return {
      values,
      style: {
        setProperty: (name: string, value: string) => {
          values[name] = value;
        },
      },
    };
  };
  const rules: unknown[] = [];
  const element = {
    id: '',
    remove: jest.fn(),
    sheet: {
      cssRules: rules,
      insertRule: (text: string, index: number) => {
        rules.splice(
          index,
          0,
          text.startsWith('@media') ? { cssRules: [styleRule()] } : styleRule(),
        );
        return index;
      },
    },
  };
  Object.assign(element.sheet, { ownerNode: element });
  const head = { append: jest.fn() };
  (globalThis as { document?: unknown }).document = {
    head,
    createElement: () => element,
  };
  const light = () => (rules[0] as ReturnType<typeof styleRule>).values;
  const dark = () =>
    (rules[1] as { cssRules: ReturnType<typeof styleRule>[] }).cssRules[0]
      .values;
  return { head, element, light, dark };
};

let doc: ReturnType<typeof fakeDocument>;

beforeEach(() => {
  doc = fakeDocument();
});

afterEach(() => {
  resetSystemColors();
  delete (globalThis as { document?: unknown }).document;
});

it('gives a system color as a variable for light and dark', () => {
  expect(PlatformColor('secondaryLabel')).toBe('var(--learnx-secondaryLabel)');
  expect(doc.head.append).toHaveBeenCalledWith(doc.element);
  expect(doc.light()['--learnx-secondaryLabel']).toBe(
    electronSystemColors(false).secondaryLabel,
  );
  expect(doc.dark()['--learnx-secondaryLabel']).toBe(
    electronSystemColors(true).secondaryLabel,
  );
});

it('takes the first known name, or the label color', () => {
  expect(PlatformColor('unknownColor', 'systemRed')).toBe(
    'var(--learnx-systemRed)',
  );
  expect(PlatformColor('unknownColor')).toBe('var(--learnx-label)');
});

it('declares each variable once', () => {
  PlatformColor('label');
  doc.light()['--learnx-label'] = 'changed';
  PlatformColor('label');
  expect(doc.light()['--learnx-label']).toBe('changed');
});

it('gives a dynamic color a variable of its own, once per pair', () => {
  const color = DynamicColorIOS({ light: '#111111', dark: '#eeeeee' });
  expect(color).toBe('var(--learnx-dynamic-1)');
  expect(DynamicColorIOS({ light: '#111111', dark: '#eeeeee' })).toBe(color);
  expect(DynamicColorIOS({ light: '#222222', dark: '#dddddd' })).toBe(
    'var(--learnx-dynamic-2)',
  );
  expect(doc.light()['--learnx-dynamic-1']).toBe('#111111');
  expect(doc.dark()['--learnx-dynamic-1']).toBe('#eeeeee');
});

it('removes its style sheet when reset', () => {
  PlatformColor('label');
  resetSystemColors();
  expect(doc.element.remove).toHaveBeenCalled();
});
