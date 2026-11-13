import type { DeadlineWidgetProps, UpNextWidgetProps } from 'widgets/props';

/**
 * The widget layouts run in the widget runtime: the `widget` directive turns
 * each into source text at build time, which `createWidget` receives. These
 * tests run that text the way the runtime does, with the components and
 * modifiers in scope, and read the element tree it returns. A component is its
 * name, and a modifier is `{ [name]: argument }`.
 */

interface Node {
  type: string;
  props: { children?: unknown; [prop: string]: unknown };
}

type Layout<P> = (props: P, environment: object) => Node;

const scope = new Proxy({} as Record<string, unknown>, {
  // Only the layout's free names: its imports and the JSX runtime.
  has: (_, name) => typeof name === 'string' && !(name in globalThis),
  get: (_, name) => {
    // `with` asks for Symbol.unscopables.
    if (typeof name !== 'string') {
      return undefined;
    }
    if (name === '_jsx' || name === '_jsxs') {
      // A component the layout defines itself runs, as in the runtime.
      return (type: unknown, props: Node['props']): Node =>
        typeof type === 'function'
          ? type(props)
          : { type: type as string, props };
    }
    if (name === 'PlatformColor') {
      return (color: string) => `PlatformColor(${color})`;
    }
    if (/^[A-Z]/.test(name)) {
      return name;
    }
    return (...args: unknown[]) => ({
      [name]: args.length > 1 ? args : args[0],
    });
  },
});

const layoutOf = <P>(load: () => unknown): Layout<P> => {
  let source = '';
  jest.isolateModules(() => {
    const { createWidget } = require('expo-widgets');
    load();
    source = jest.mocked(createWidget).mock.calls.at(-1)![1];
  });
  // oxlint-disable-next-line no-new-func, typescript/no-implied-eval -- runs the layout as the widget runtime does
  return new Function('scope', `with (scope) { return (${source}); }`)(scope);
};

const childrenOf = (node: Node): Node[] =>
  [node.props.children]
    .flat(Infinity)
    .filter((child): child is Node => !!child && typeof child === 'object');

const all = (node: Node): Node[] => [node, ...childrenOf(node).flatMap(all)];

/** Each Text's words, a relative date as `in <ISO time>`. */
const texts = (node: Node) =>
  all(node)
    .filter(n => n.type === 'Text')
    .map(n =>
      n.props.date
        ? `in ${(n.props.date as Date).toISOString()}`
        : [n.props.children].flat().join(''),
    );

const modifier = (node: Node, name: string) =>
  (node.props.modifiers as Record<string, unknown>[] | undefined)
    ?.filter(Boolean)
    .find(m => name in m)?.[name];

/**
 * The version of a deadline list with this many rows: the layout offers one
 * per row count in a ViewThatFits, which shows the longest that fits.
 */
const version = (node: Node, rows: number) => {
  expect(node.type).toBe('ViewThatFitsView');
  // The header and the rows.
  return childrenOf(node).find(v => childrenOf(v).length === rows + 1)!;
};

const links = (node: Node) =>
  all(node)
    .filter(n => n.type === 'Link')
    .map(n => n.props.destination);

/** Android rows open through the `openUrl` modifier of our patch. */
const openUrls = (node: Node) =>
  all(node).flatMap(n =>
    ((n.props.modifiers as { $type?: string; url?: string }[]) ?? [])
      .filter(m => m?.$type === 'openUrl')
      .map(m => m.url),
  );

const at = (time: string) => new Date(`2026-11-10T${time}:00+08:00`).getTime();
const now = at('10:00');
const iso = (ms: number) => new Date(ms).toISOString();

const klass = (
  key: string,
  start: number,
  end: number,
  location = '六教6A414',
) => ({
  key,
  courseName: `Course ${key}`,
  location,
  start,
  end,
  time: `${key}-time`,
  day: `${key}-day`,
});

const deadline = (
  id: string,
  ms: number,
  url = `learnx://assignment/${id}`,
) => ({
  id,
  title: `Assignment ${id}`,
  courseName: `Course of ${id}`,
  deadline: ms,
  due: `${id}-due`,
  url,
  // Uncolored until it's due; coloredDeadlines sets its own.
  soonFrom: ms,
  urgentFrom: ms,
});

const DAY = 86400000;

/** Three deadlines turning red, turning orange and not yet colored at `now`. */
const coloredDeadlines = [
  { ...deadline('red', at('20:00')), soonFrom: 0, urgentFrom: now - 1 },
  {
    ...deadline('orange', at('20:00') + DAY),
    soonFrom: now,
    urgentFrom: now + 10 * 3600000,
  },
  {
    ...deadline('plain', at('20:00') + 3 * DAY),
    soonFrom: now + DAY,
    urgentFrom: now + 2 * DAY,
  },
];

/** The Text that shows a deadline's due time, relative or formatted. */
const dueText = (node: Node, ms: number, due: string) =>
  all(node).find(
    n =>
      n.type === 'Text' &&
      ((n.props.date as Date | undefined)?.getTime() === ms ||
        n.props.children === due),
  )!;

const upNextProps: UpNextWidgetProps = {
  classes: [
    klass('past', at('08:00'), at('09:35')),
    klass('now', at('09:50'), at('11:25')),
    klass('later', at('13:30') + DAY, at('15:05') + DAY, ''),
    klass('c3', at('08:00') + 2 * DAY, at('09:35') + 2 * DAY),
    klass('c4', at('08:00') + 3 * DAY, at('09:35') + 3 * DAY),
    klass('c5', at('08:00') + 4 * DAY, at('09:35') + 4 * DAY),
    klass('c6', at('08:00') + 5 * DAY, at('09:35') + 5 * DAY),
  ],
  deadlines: [
    deadline('gone', at('09:00')),
    deadline('d1', at('23:59')),
    deadline('d2', at('23:59') + DAY),
    deadline('d3', at('23:59') + 2 * DAY),
    deadline('d4', at('23:59') + 3 * DAY),
  ],
  title: 'Up Next',
  now: 'Now',
  next: 'Next',
  later: 'Later',
  due: 'Due',
  startsIn: 'Starts in',
  endsIn: 'Ends in',
  tomorrow: 'Tomorrow',
  noClasses: 'No more classes',
  url: 'learnx://today',
};

const deadlineProps: DeadlineWidgetProps = {
  deadlines: [1, 2, 3, 4, 5, 6, 7].map(i =>
    deadline(`d${i}`, at('23:59') + i * DAY),
  ),
  total: 9,
  title: 'Deadlines',
  empty: 'Nothing due',
  url: 'learnx://assignment',
};

describe('Up Next on iOS', () => {
  const layout = layoutOf<UpNextWidgetProps>(() => require('widgets/UpNext'));
  const render = (widgetFamily?: string, props = upNextProps) =>
    layout(props, { widgetFamily, date: new Date(now) });

  it('shows the class on now with its end countdown, and the next deadline', () => {
    const widget = render('systemMedium');
    expect(texts(widget)).toEqual([
      'Now',
      'Course now',
      'now-time · 六教6A414',
      'Ends in ',
      `in ${iso(at('11:25'))}`,
      'Due: Assignment d1 · ',
      `in ${iso(at('23:59'))}`,
    ]);
    expect(links(widget)).toEqual(['learnx://assignment/d1']);
    expect(modifier(widget, 'widgetURL')).toBe('learnx://today');
    expect(modifier(widget, 'containerBackground')).toEqual([
      'PlatformColor(systemBackground)',
      'widget',
    ]);
  });

  it("counts down to today's next class, and dates the ones after tomorrow", () => {
    const props = { ...upNextProps, classes: upNextProps.classes.slice(2) };
    const today = layout(
      { ...props, classes: [klass('soon', at('13:30'), at('15:05'))] },
      { widgetFamily: 'systemMedium', date: new Date(now) },
    );
    expect(texts(today).slice(0, 5)).toEqual([
      'Next',
      'Course soon',
      'soon-time · 六教6A414',
      'Starts in ',
      `in ${iso(at('13:30'))}`,
    ]);

    const widget = render('systemLarge', props);
    expect(texts(widget).slice(0, 5)).toEqual([
      'Next',
      'Course later',
      'Tomorrow later-time',
      'Later',
      'c3-day c3-time',
    ]);
  });

  it('fits only the featured class in a small widget, without a countdown', () => {
    expect(texts(render('systemSmall'))).toEqual([
      'Now',
      'Course now',
      'now-time · 六教6A414',
    ]);
  });

  it('lists four more classes and three deadlines under headings when large', () => {
    for (const family of ['systemLarge', 'systemExtraLarge']) {
      const widget = render(family);
      const words = texts(widget);
      expect(words).toContain('Later');
      expect(words).toContain('Due');
      expect(words).toContain('c5-day c5-time');
      expect(words).not.toContain('Course c6');
      expect(words).toContain('Assignment d3 · ');
      expect(links(widget)).toHaveLength(3);
    }
  });

  it('shows the class with its countdown on the Lock Screen', () => {
    expect(texts(render('accessoryRectangular'))).toEqual([
      'Course now',
      'now-time · 六教6A414',
      `in ${iso(at('11:25'))}`,
    ]);
    const tomorrow = { ...upNextProps, classes: upNextProps.classes.slice(2) };
    expect(texts(render('accessoryRectangular', tomorrow))).toEqual([
      'Course later',
      'Tomorrow later-time',
    ]);
    expect(
      texts(render('accessoryRectangular', { ...upNextProps, classes: [] })),
    ).toEqual(['No more classes']);
  });

  it('says when no classes are left, and works without props or a date', () => {
    const empty = { ...upNextProps, classes: [], deadlines: [], url: '' };
    const widget = render(undefined, empty);
    expect(texts(widget)).toEqual(['Up Next', 'No more classes']);
    expect(modifier(widget, 'widgetURL')).toBeUndefined();

    jest.spyOn(Date, 'now').mockReturnValue(now);
    const bare = layout({ ...upNextProps, classes: undefined } as never, {});
    expect(texts(bare)[0]).toBe('Up Next');
  });
});

describe('Deadlines on iOS', () => {
  const layout = layoutOf<DeadlineWidgetProps>(() =>
    require('widgets/Deadlines'),
  );
  const render = (widgetFamily?: string, props = deadlineProps) =>
    layout(props, { widgetFamily, colorScheme: 'dark' });

  it('colors due dates red under a day and orange by tomorrow, by its clock', () => {
    const widget = layout(
      { ...deadlineProps, deadlines: coloredDeadlines },
      { widgetFamily: 'systemLarge', date: new Date(now) },
    );
    const color = (i: number) =>
      modifier(
        dueText(widget, coloredDeadlines[i].deadline, ''),
        'foregroundStyle',
      );
    expect(color(0)).toBe('PlatformColor(systemRed)');
    expect(color(1)).toBe('PlatformColor(systemOrange)');
    expect(color(2)).toEqual({ type: 'hierarchical', style: 'secondary' });
  });

  it('opens the next assignment from the Lock Screen', () => {
    const widget = render('accessoryRectangular');
    expect(texts(widget)).toEqual([
      'Assignment d1',
      `in ${iso(at('23:59') + DAY)}`,
      'Course of d1',
    ]);
    expect(modifier(widget, 'widgetURL')).toBe('learnx://assignment/d1');

    const empty = render('accessoryRectangular', {
      ...deadlineProps,
      deadlines: [],
    });
    expect(texts(empty)).toEqual(['Nothing due']);
    expect(modifier(empty, 'widgetURL')).toBe('learnx://assignment');
  });

  it('offers the list with each number of rows, the longest first', () => {
    const widget = render('systemMedium');
    expect(widget.props.axes).toBe('vertical');
    expect(childrenOf(widget).map(v => childrenOf(v).length - 1)).toEqual([
      5, 4, 3, 2, 1,
    ]);
    expect(modifier(widget, 'widgetURL')).toBe('learnx://assignment');
    expect(modifier(widget, 'containerBackground')).toEqual([
      'PlatformColor(systemBackground)',
      'widget',
    ]);

    const two = render('systemMedium', {
      ...deadlineProps,
      deadlines: deadlineProps.deadlines.slice(0, 2),
    });
    expect(childrenOf(two).map(v => childrenOf(v).length - 1)).toEqual([2, 1]);
  });

  it('links rows with their courses in a medium widget, counting the rest', () => {
    const list = version(render(undefined), 3);
    expect(texts(list)).toEqual([
      'Deadlines',
      '+6',
      ...[1, 2, 3].flatMap(i => [
        `Assignment d${i}`,
        `Course of d${i} · `,
        `in ${iso(at('23:59') + i * DAY)}`,
      ]),
    ]);
    expect(links(list)).toEqual(
      [1, 2, 3].map(i => `learnx://assignment/d${i}`),
    );
  });

  it('lists rows without courses or links in a small widget', () => {
    const widget = render('systemSmall');
    expect(texts(version(widget, 3))).toEqual([
      'Deadlines',
      '+6',
      ...[1, 2, 3].flatMap(i => [
        `Assignment d${i}`,
        `in ${iso(at('23:59') + i * DAY)}`,
      ]),
    ]);
    expect(texts(version(widget, 1)).slice(0, 2)).toEqual(['Deadlines', '+8']);
    expect(links(widget)).toEqual([]);
  });

  it('shows rows with their due times when large, up to ten', () => {
    const widget = render('systemLarge');
    expect(childrenOf(widget)).toHaveLength(7);
    const six = version(widget, 6);
    expect(texts(six)).toContain('d6-due');
    expect(texts(six)).not.toContain('Assignment d7');
    expect(texts(six)).toContain('+3');
    expect(links(version(render('systemExtraLarge'), 6))).toHaveLength(6);

    const many = render('systemLarge', {
      ...deadlineProps,
      deadlines: Array.from({ length: 12 }, (_, i) =>
        deadline(`m${i}`, at('23:59') + i * DAY),
      ),
      total: 12,
    });
    expect(childrenOf(many)).toHaveLength(10);
  });

  it('says when nothing is due, and leaves rows from before links unlinked', () => {
    const empty = render('systemMedium', {
      ...deadlineProps,
      deadlines: undefined,
      total: 0,
      url: '',
    } as never);
    expect(texts(empty)).toEqual(['Deadlines', 'Nothing due']);
    expect(modifier(empty, 'widgetURL')).toBeUndefined();

    const old = render('systemMedium', {
      ...deadlineProps,
      deadlines: [deadline('old', at('23:59'), '')],
      total: 1,
    });
    expect(links(old)).toEqual([]);
    expect(texts(old)).toContain('Assignment old');
  });
});

describe('Deadlines on Android', () => {
  const layout = layoutOf<DeadlineWidgetProps>(() =>
    require('widgets/Deadlines.android'),
  );

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  it('leaves out passed deadlines, shows four and counts the rest', () => {
    const props = {
      ...deadlineProps,
      deadlines: [deadline('gone', at('09:00')), ...deadlineProps.deadlines],
      total: 10,
    };
    const widget = layout(props, { colorScheme: 'dark' });
    expect(texts(widget)).toEqual([
      'Deadlines',
      '  +5',
      ...[1, 2, 3, 4].flatMap(i => [
        `Assignment d${i}`,
        `d${i}-due`,
        ` · Course of d${i}`,
      ]),
    ]);
    expect(openUrls(widget)).toEqual([
      'learnx://assignment',
      ...[1, 2, 3, 4].map(i => `learnx://assignment/d${i}`),
    ]);
    expect(modifier(widget, 'background')).toBe('#171216');
  });

  it('colors due times red under a day and orange by tomorrow', () => {
    const widget = layout(
      { ...deadlineProps, deadlines: coloredDeadlines },
      { colorScheme: 'light' },
    );
    const color = (id: string) => dueText(widget, -1, `${id}-due`).props.color;
    expect(color('red')).toBe('#BA1A1A');
    expect(color('orange')).toBe('#9A4605');
    expect(color('plain')).toBe('#4D444C');
  });

  it('asks to open the app before it has sent anything, in the system language', () => {
    const initial = {
      deadlines: [],
      total: 0,
      title: '',
      empty: '',
      url: '',
    };
    const english = layout(initial, { locale: 'en-US' });
    expect(texts(english)).toEqual([
      'Deadlines',
      'Open learnX to see deadlines',
    ]);
    expect(openUrls(english)).toEqual([]);
    expect(modifier(english, 'background')).toBe('#FFF7FA');
    expect(texts(layout(initial, { locale: 'zh-Hans-CN' }))).toEqual([
      '作业截止',
      '打开 learnX 以显示作业',
    ]);
    expect(
      texts(
        layout(
          { ...initial, deadlines: undefined, total: undefined } as never,
          {},
        ),
      ),
    ).toEqual(['Deadlines', 'Open learnX to see deadlines']);
  });
});

describe('Up Next on Android', () => {
  const layout = layoutOf<UpNextWidgetProps>(() =>
    require('widgets/UpNext.android'),
  );

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  it('shows the class on now, the one after and the next deadline', () => {
    const widget = layout(upNextProps, { colorScheme: 'dark' });
    expect(texts(widget)).toEqual([
      'Now',
      'Course now',
      'now-time · 六教6A414',
      'Later: Tomorrow later-time Course later',
      'Due d1-due  ',
      'Assignment d1',
    ]);
    expect(openUrls(widget)).toEqual([
      'learnx://today',
      'learnx://assignment/d1',
    ]);
  });

  it("dates a class after tomorrow, and leaves out what's missing", () => {
    const props = {
      ...upNextProps,
      classes: [klass('c3', at('08:00') + 2 * DAY, at('09:35') + 2 * DAY, '')],
      deadlines: [],
    };
    expect(texts(layout(props, {}))).toEqual([
      'Next',
      'Course c3',
      'c3-day c3-time',
    ]);
    const today = {
      ...props,
      classes: [klass('soon', at('13:30'), at('15:05'))],
    };
    expect(texts(layout(today, {}))[2]).toBe('soon-time · 六教6A414');
  });

  it('asks to open the app before it has sent anything, in the system language', () => {
    const initial = {
      ...upNextProps,
      classes: undefined,
      deadlines: undefined,
      title: '',
      noClasses: '',
      url: '',
    } as never;
    expect(texts(layout(initial, {}))).toEqual([
      'Up Next',
      'Open learnX to see your classes',
    ]);
    expect(texts(layout(initial, { locale: 'zh-Hans' }))).toEqual([
      '接下来',
      '打开 learnX 以显示课程',
    ]);
  });
});
