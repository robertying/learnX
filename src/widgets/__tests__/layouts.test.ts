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

/** The props a widget is registered with, which the build embeds with it. */
const initialPropsOf = <P>(load: () => unknown): P => {
  let props: P | undefined;
  jest.isolateModules(() => {
    const { createWidget } = require('expo-widgets');
    load();
    props = jest.mocked(createWidget).mock.calls.at(-1)![2];
  });
  return props!;
};

const childrenOf = (node: Node): Node[] =>
  [node.props.children]
    .flat(Infinity)
    .filter((child): child is Node => !!child && typeof child === 'object');

const all = (node: Node): Node[] => [node, ...childrenOf(node).flatMap(all)];

/** A Text with words of its own, not one made of other Texts. */
const isText = (node: Node) =>
  node.type === 'Text' &&
  !childrenOf(node).some(child => child.type === 'Text');

const isCountdown = (node: Node) => node.props.dateStyle === 'countdown';

const modifier = (node: Node, name: string) =>
  (node.props.modifiers as Record<string, unknown>[] | undefined)
    ?.filter(Boolean)
    .find(m => name in m)?.[name];

/**
 * Each Text's words, a countdown (our @expo/ui patch) or relative date as
 * `in <ISO time>`. A Text made of parts gives its words and its Texts in order.
 * `spoken`: what VoiceOver reads instead, a label or nothing for a hidden one;
 * a Text made of parts is one Text to SwiftUI, read as its parts run together.
 */
const texts = (node: Node, spoken = false): string[] => {
  if (spoken && node.type === 'Text' && !isText(node)) {
    return [partsSpoken(node)];
  }
  if (spoken && modifier(node, 'accessibilityHidden')) {
    return [];
  }
  const label = spoken
    ? (modifier(node, 'accessibilityLabel') as string | undefined)
    : undefined;
  if (label !== undefined) {
    return [label];
  }
  if (node.props.date) {
    return [`in ${(node.props.date as Date).toISOString()}`];
  }
  if (isText(node)) {
    return [[node.props.children].flat().join('')];
  }
  return node.type === 'Text'
    ? [node.props.children]
        .flat(Infinity)
        .flatMap(child =>
          typeof child === 'string'
            ? [child]
            : child && typeof child === 'object'
              ? texts(child as Node, spoken)
              : [],
        )
    : childrenOf(node).flatMap(child => texts(child, spoken));
};

/** A Text made of parts as VoiceOver reads it: its parts' words in a row. */
const partsSpoken = (node: Node): string =>
  [node.props.children]
    .flat(Infinity)
    .map(child =>
      typeof child === 'string'
        ? child
        : child && typeof child === 'object'
          ? texts(child as Node, true).join('')
          : '',
    )
    .join('');

/**
 * What VoiceOver reads for each element a layout combines
 * (`accessibilityElement('combine')`): its texts' labels, or their words,
 * leaving out hidden ones.
 */
const spoken = (node: Node) =>
  all(node)
    .filter(n => modifier(n, 'accessibilityElement') === 'combine')
    .map(n => texts(n, true));

/**
 * The version of a deadline list with this many rows: the layout offers one
 * per row count in a ViewThatFits, which shows the longest that fits.
 */
const version = (node: Node, rows: number) => {
  expect(node.type).toBe('ViewThatFitsView');
  // The header and the rows.
  return childrenOf(node).find(v => rowsOf(v).length === rows + 1)!;
};

/** A version's header and rows, without the spacers between them. */
const rowsOf = (node: Node) =>
  childrenOf(node).filter(child => child.type !== 'Spacer');

const links = (node: Node) =>
  all(node)
    .filter(n => n.type === 'Link')
    .map(n => n.props.destination);

/** What TalkBack reads: the `contentDescription` modifier of our patch. */
const descriptions = (node: Node) =>
  all(node).flatMap(n =>
    ((n.props.modifiers as { $type?: string; text?: string }[]) ?? [])
      .filter(m => m?.$type === 'contentDescription')
      .map(m => m.text),
  );

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
  startTime: `${key}-start`,
  // As the app writes them with its date formats (widgets/index)
  tomorrow: `Tomorrow ${key}-time`,
  tomorrowStart: `Tomorrow ${key}-start`,
  weekday: `${key}-weekday ${key}-time`,
  weekdayStart: `${key}-weekday ${key}-start`,
  day: `${key}-day ${key}-time`,
  dayStart: `${key}-day ${key}-start`,
  url: `learnx://course/${key}`,
});

const deadline = (id: string, ms: number) => ({
  id,
  title: `Assignment ${id}`,
  courseName: `Course of ${id}`,
  deadline: ms,
  due: `${id}-due`,
  url: `learnx://assignment/${id}`,
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

/** The Text that shows a deadline's due time, a countdown or formatted. */
const dueText = (node: Node, ms: number, due: string) =>
  all(node).find(
    n =>
      isText(n) &&
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
  title: 'Up Next',
  now: 'Now',
  next: 'Next',
  later: 'Later',
  startsIn: 'Starts in',
  endsIn: 'Ends in',
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

describe('iOS layouts', () => {
  it('use no Babel helpers, which the widget runtime lacks', () => {
    for (const load of [
      () => require('widgets/UpNext'),
      () => require('widgets/Deadlines'),
    ]) {
      jest.isolateModules(() => {
        const { createWidget } = require('expo-widgets');
        load();
        const source: string = jest.mocked(createWidget).mock.calls.at(-1)![1];
        // Calls to underscored names other than the JSX runtime's, such as
        // _slicedToArray for array destructuring.
        expect(
          new Set(source.match(/\b_[a-zA-Z]+(?=\()/g)).difference(
            new Set(['_jsx', '_jsxs']),
          ),
        ).toEqual(new Set());
      });
    }
  });
});

describe('Up Next on iOS', () => {
  const layout = layoutOf<UpNextWidgetProps>(() => require('widgets/UpNext'));
  const render = (widgetFamily?: string, props = upNextProps) =>
    layout(props, { widgetFamily, date: new Date(now) });

  /** How many later classes each version shows, in order. */
  const shown = (widget: Node) => {
    expect(widget.type).toBe('ViewThatFitsView');
    return childrenOf(widget).map(
      v => texts(v).filter(w => / .*-time$/.test(w)).length,
    );
  };

  it('shows the class on now with its end countdown, and the classes after it', () => {
    const widget = render('systemMedium');
    // Up to four, the most first.
    expect(shown(widget)).toEqual([4, 3, 2, 1, 0]);
    const oneLater = childrenOf(widget)[3];
    expect(texts(oneLater)).toEqual([
      'Now',
      'Course now',
      'now-time',
      ' · 六教6A414',
      'Ends in ',
      `in ${iso(at('11:25'))}`,
      'Course later',
      'Tomorrow later-time',
    ]);
    // The label and the countdown are one Text.
    const label = all(oneLater).filter(
      n => n.type === 'Text' && childrenOf(n).some(isCountdown),
    );
    expect(label.map(n => modifier(n, 'font'))).toEqual([
      { textStyle: 'footnote' },
    ]);
    // In Chinese, no space typed before the countdown: iOS draws the gap.
    expect(
      texts(render('systemMedium', { ...upNextProps, locale: 'zh_Hans' })),
    ).toContain('Ends in');
    // VoiceOver reads each class as one element, without the dot ("in …"
    // stands for the countdown).
    expect(spoken(oneLater)).toEqual([
      ['Course now', 'now-time', '六教6A414', `Ends in in ${iso(at('11:25'))}`],
      ['Course later', 'Tomorrow later-time'],
    ]);
    // Each class opens its course; no deadlines.
    expect(links(oneLater)).toEqual([
      'learnx://course/now',
      'learnx://course/later',
    ]);
    // Medium widgets don't name the section.
    expect(texts(childrenOf(widget)[0])).not.toContain('Later');
    // The times line up at the end of the rows.
    const row = all(oneLater).find(
      n => n.type === 'HStack' && texts(n)[0] === 'Course later',
    )!;
    expect(childrenOf(row).map(n => n.type)).toEqual([
      'Text',
      'Spacer',
      'Text',
    ]);
    // Countdowns follow the app's language, not the system's; props from
    // before it leave the system's.
    expect(modifier(widget, 'environment')).toBeUndefined();
    for (const family of [
      'systemSmall',
      'systemMedium',
      'accessoryRectangular',
    ]) {
      expect(
        modifier(
          render(family, { ...upNextProps, locale: 'zh_Hans' }),
          'environment',
        ),
      ).toEqual(['locale', 'zh_Hans']);
    }
    expect(modifier(widget, 'widgetURL')).toBe('learnx://today');
    expect(modifier(widget, 'containerBackground')).toEqual([
      'PlatformColor(systemBackground)',
      'widget',
    ]);
  });

  it("counts down to today's next class, and names the days after tomorrow", () => {
    const props = { ...upNextProps, classes: upNextProps.classes.slice(2) };
    const today = layout(
      { ...props, classes: [klass('soon', at('13:30'), at('15:05'))] },
      { widgetFamily: 'systemMedium', date: new Date(now) },
    );
    expect(texts(today).slice(0, 6)).toEqual([
      'Next',
      'Course soon',
      'soon-time',
      ' · 六教6A414',
      'Starts in ',
      `in ${iso(at('13:30'))}`,
    ]);

    const widget = render('systemLarge', props);
    // The weekday within a week, the date from a week on.
    expect(texts(widget).slice(0, 6)).toEqual([
      'Next',
      'Course later',
      'Tomorrow later-time',
      'Later',
      'Course c3',
      'c3-weekday c3-time',
    ]);
    const nextWeek = layout(
      {
        ...props,
        classes: [klass('far', at('08:00') + 7 * DAY, at('09:35') + 7 * DAY)],
      },
      { widgetFamily: 'systemMedium', date: new Date(now) },
    );
    expect(texts(nextWeek).slice(2, 4)).toEqual([
      'far-day far-time',
      ' · 六教6A414',
    ]);
    // A long place is cut in the middle, keeping the room number.
    expect(
      modifier(
        all(nextWeek).find(n => n.props.children === ' · 六教6A414')!,
        'truncationMode',
      ),
    ).toBe('middle');
    // Each class row opens its course.
    expect(links(childrenOf(widget)[0]).slice(0, 2)).toEqual([
      'learnx://course/later',
      'learnx://course/c3',
    ]);
  });

  it('lists the classes after this one in a small widget as they fit', () => {
    const widget = render('systemSmall');
    expect(widget.type).toBe('ViewThatFitsView');
    const versions = childrenOf(widget);
    // Three classes after it, then two, one, and none with the class in full,
    // in two ways.
    expect(
      versions.map(v => texts(v).filter(w => /^[^n].*-start$/.test(w)).length),
    ).toEqual([3, 2, 1, 0, 0]);
    // In short: the start alone, under each course.
    expect(texts(versions[1])).toEqual([
      'Now',
      'Course now',
      'now-start',
      ' · 六教6A414',
      'Ends in ',
      `in ${iso(at('11:25'))}`,
      'Course later',
      'Tomorrow later-start',
      'Course c3',
      'c3-weekday c3-start',
    ]);
    // With no room for them, the class in full with its place on a line of
    // its own, then without the countdown.
    const withCountdown = versions[3];
    expect(texts(withCountdown)).toEqual([
      'Now',
      'Course now',
      'now-time',
      '六教6A414',
      'Ends in ',
      `in ${iso(at('11:25'))}`,
    ]);
    expect(texts(versions[4])).toEqual([
      'Now',
      'Course now',
      'now-time',
      '六教6A414',
    ]);
    // One tap target: Today.
    expect(modifier(widget, 'widgetURL')).toBe('learnx://today');
    // Its largest unit only, to fit the width.
    expect(all(withCountdown).find(isCountdown)!.props.maxFieldCount).toBe(1);
    expect(links(widget)).toEqual([]);
  });

  it('lists as many classes as fit under a heading when large', () => {
    for (const family of ['systemLarge', 'systemExtraLarge']) {
      const widget = render(family);
      // All five classes after this one, then one fewer at a time.
      expect(shown(widget)).toEqual([5, 4, 3, 2, 1, 0]);
      const [all5, cut] = childrenOf(widget);
      expect(texts(all5)).toContain('c6-weekday c6-time');
      // Showing everything, it keeps to the top; leaving rows out, it
      // spreads them, the heading staying with the first row.
      const spacers = (v: Node) =>
        childrenOf(v).filter(child => child.type === 'Spacer');
      expect(spacers(all5)).toEqual([]);
      expect(spacers(cut).map(spacer => spacer.props.minLength)).toEqual(
        Array(4).fill(10),
      );
      expect(texts(childrenOf(cut)[2]).slice(0, 3)).toEqual([
        'Later',
        'Course later',
        'Tomorrow later-time',
      ]);
    }
  });

  it('shows the class, its day and start with the countdown, and its place on the Lock Screen', () => {
    // The start and the countdown, the place on a line of its own.
    expect(texts(render('accessoryRectangular'))).toEqual([
      'Course now',
      'now-start · ',
      `in ${iso(at('11:25'))}`,
      '六教6A414',
    ]);
    // VoiceOver reads it as one element, without the dot.
    expect(spoken(render('accessoryRectangular'))).toEqual([
      ['Course now', 'now-start', `in ${iso(at('11:25'))}`, '六教6A414'],
    ]);
    // Opens the class's course, or Today when its course isn't known.
    expect(modifier(render('accessoryRectangular'), 'widgetURL')).toBe(
      'learnx://course/now',
    );
    expect(
      modifier(
        render('accessoryRectangular', {
          ...upNextProps,
          classes: [
            { ...klass('x', at('13:30'), at('15:05')), url: undefined },
          ],
        }),
        'widgetURL',
      ),
    ).toBe('learnx://today');
    expect(
      all(render('accessoryRectangular')).find(isCountdown)!.props
        .maxFieldCount,
    ).toBe(1);
    // Without a place, the countdown alone; not today, the place alone.
    const unplaced = layout(
      {
        ...upNextProps,
        classes: [klass('soon', at('13:30'), at('15:05'), '')],
      },
      { widgetFamily: 'accessoryRectangular', date: new Date(now) },
    );
    expect(texts(unplaced)).toEqual([
      'Course soon',
      'soon-start · ',
      `in ${iso(at('13:30'))}`,
    ]);
    const later = { ...upNextProps, classes: upNextProps.classes.slice(3) };
    expect(texts(render('accessoryRectangular', later))).toEqual([
      'Course c3',
      'c3-weekday c3-start',
      '六教6A414',
    ]);
    const tomorrow = { ...upNextProps, classes: upNextProps.classes.slice(2) };
    expect(texts(render('accessoryRectangular', tomorrow))).toEqual([
      'Course later',
      'Tomorrow later-start',
    ]);
    expect(
      texts(render('accessoryRectangular', { ...upNextProps, classes: [] })),
    ).toEqual(['No more classes']);
  });

  it('says when no classes are left, and works without props or a date', () => {
    const empty = { ...upNextProps, classes: [], url: '' };
    const widget = render(undefined, empty);
    expect(texts(widget)).toEqual(['Up Next', 'No more classes']);
    expect(modifier(widget, 'widgetURL')).toBeUndefined();

    jest.spyOn(Date, 'now').mockReturnValue(now);
    const bare = layout({ ...upNextProps, classes: undefined } as never, {});
    expect(texts(bare)[0]).toBe('Up Next');
  });

  it('asks to open the app before it has sent anything, in the system language', () => {
    const initial = initialPropsOf<UpNextWidgetProps>(() =>
      require('widgets/UpNext'),
    );
    expect(initial.classes).toEqual([]);
    const english = layout(initial, { locale: 'en_US', date: new Date(now) });
    expect(texts(english)).toEqual([
      'Next Class',
      'Open learnX to show your classes here',
    ]);
    expect(modifier(english, 'widgetURL')).toBeUndefined();
    expect(
      texts(layout(initial, { locale: 'zh-Hans_CN', date: new Date(now) })),
    ).toEqual(['下一节课', '打开learnX后，这里会显示接下来的课']);
    expect(
      texts(
        layout(initial, {
          widgetFamily: 'accessoryRectangular',
          date: new Date(now),
        }),
      ),
    ).toEqual(['Open learnX to show your classes here']);
  });
});

describe('Deadlines on iOS', () => {
  const layout = layoutOf<DeadlineWidgetProps>(() =>
    require('widgets/Deadlines'),
  );
  const render = (widgetFamily?: string, props = deadlineProps) =>
    layout(props, { widgetFamily, colorScheme: 'dark' });

  // The entry's date counts until the widget's own clock is past it.
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

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
      'Course of d1',
      `in ${iso(at('23:59') + DAY)}`,
    ]);
    expect(modifier(widget, 'widgetURL')).toBe('learnx://assignment/d1');
    expect(spoken(widget)).toEqual([texts(widget)]);

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
    expect(childrenOf(widget).map(v => rowsOf(v).length - 1)).toEqual([
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
    expect(childrenOf(two).map(v => rowsOf(v).length - 1)).toEqual([2, 1]);
  });

  it('spreads the rows over the height only when it leaves some out', () => {
    const spacers = (v: Node) =>
      childrenOf(v)
        .filter(child => child.type === 'Spacer')
        .map(child => child.props.minLength);
    // Nine open, so every version leaves some out: a gap at least as wide
    // as the rows' spacing between each pair.
    const cut = version(render('systemMedium'), 3);
    expect(cut.props.spacing).toBe(0);
    expect(spacers(cut)).toEqual([4, 4, 4]);
    expect(spacers(version(render('systemLarge'), 6))).toEqual(
      Array(6).fill(12),
    );

    // Two open: the version with both keeps them at the top.
    const two = render('systemMedium', {
      ...deadlineProps,
      deadlines: deadlineProps.deadlines.slice(0, 2),
      total: 2,
    });
    expect(spacers(version(two, 2))).toEqual([]);
    expect(version(two, 2).props.spacing).toBe(4);
    expect(spacers(version(two, 1))).toEqual([4]);
  });

  it('links rows with their courses in a medium widget, counting the rest', () => {
    const list = version(render(undefined), 3);
    expect(texts(list)).toEqual([
      'Deadlines',
      '+6',
      ...[1, 2, 3].flatMap(i => [
        `Assignment d${i}`,
        `Course of d${i}`,
        ' · ',
        `in ${iso(at('23:59') + i * DAY)}`,
      ]),
    ]);
    expect(links(list)).toEqual(
      [1, 2, 3].map(i => `learnx://assignment/d${i}`),
    );
    // VoiceOver reads each row as one element, without the dots.
    expect(spoken(list)).toEqual(
      [1, 2, 3].map(i => [
        `Assignment d${i}`,
        `Course of d${i}`,
        `in ${iso(at('23:59') + i * DAY)}`,
      ]),
    );
  });

  it('lists rows with the time left and the course, and no links, in a small widget', () => {
    const widget = render('systemSmall');
    expect(texts(version(widget, 3))).toEqual([
      'Deadlines',
      '+6',
      ...[1, 2, 3].flatMap(i => [
        `Assignment d${i}`,
        `in ${iso(at('23:59') + i * DAY)}`,
        ` · Course of d${i}`,
      ]),
    ]);
    // The time left in its largest unit, to leave the course room.
    expect(
      all(version(widget, 3))
        .filter(isCountdown)
        .map(n => n.props.maxFieldCount),
    ).toEqual([1, 1, 1]);
    expect(texts(version(widget, 1)).slice(0, 2)).toEqual(['Deadlines', '+8']);
    expect(links(widget)).toEqual([]);
    // The time left and the course are one Text: a pause between them.
    expect(spoken(version(widget, 3))).toEqual(
      [1, 2, 3].map(i => [
        `Assignment d${i}`,
        `in ${iso(at('23:59') + i * DAY)}, Course of d${i}`,
      ]),
    );
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

  it('drops the deadlines passed by its own clock once the timeline has run out', () => {
    const props = {
      ...deadlineProps,
      deadlines: [deadline('gone', at('09:00')), ...deadlineProps.deadlines],
      total: 10,
    };
    const drawn = (date: number, family = 'systemMedium') =>
      layout(props, { widgetFamily: family, date: new Date(date) });
    // The last entry, drawn again after it: the clock is past it.
    const stale = version(drawn(at('08:00')), 5);
    expect(texts(stale)).not.toContain('Assignment gone');
    expect(texts(stale)).toContain('Assignment d5');
    expect(texts(stale)).toContain('+4');
    expect(texts(drawn(at('08:00'), 'accessoryRectangular'))[0]).toBe(
      'Assignment d1',
    );
    // An entry drawn ahead of its time goes by its own date.
    jest.spyOn(Date, 'now').mockReturnValue(at('07:00'));
    expect(texts(version(drawn(at('08:00')), 5))).toContain('Assignment gone');
    expect(texts(version(drawn(now), 5))).not.toContain('Assignment gone');
  });

  it('says when nothing is due', () => {
    const empty = render('systemMedium', {
      ...deadlineProps,
      deadlines: undefined,
      total: 0,
      url: '',
    } as never);
    expect(texts(empty)).toEqual(['Deadlines', 'Nothing due']);
    expect(modifier(empty, 'widgetURL')).toBeUndefined();
  });

  it("draws countdowns in the app's language", () => {
    const props = { ...deadlineProps, locale: 'en' };
    for (const family of [
      'systemSmall',
      'systemLarge',
      'accessoryRectangular',
    ]) {
      expect(modifier(render(family, props), 'environment')).toEqual([
        'locale',
        'en',
      ]);
    }
    expect(
      modifier(
        render('systemMedium', { ...props, total: 0, deadlines: [] }),
        'environment',
      ),
    ).toEqual(['locale', 'en']);
  });

  it('asks to open the app before it has sent anything, in the system language', () => {
    const initial = initialPropsOf<DeadlineWidgetProps>(() =>
      require('widgets/Deadlines'),
    );
    expect(initial.deadlines).toEqual([]);
    const english = layout(initial, { locale: 'en_US', date: new Date(now) });
    expect(texts(english)).toEqual([
      'Deadlines',
      'Open learnX to show your deadlines here',
    ]);
    expect(modifier(english, 'widgetURL')).toBeUndefined();
    expect(
      texts(layout(initial, { locale: 'zh-Hans_CN', date: new Date(now) })),
    ).toEqual(['作业截止', '打开learnX后，这里会显示作业']);
    expect(
      texts(
        layout(initial, {
          widgetFamily: 'accessoryRectangular',
          date: new Date(now),
        }),
      ),
    ).toEqual(['Open learnX to show your deadlines here']);
  });
});

/** The most children any container in the tree has: Glance draws only 10. */
const mostChildren = (node: Node) =>
  Math.max(...all(node).map(n => childrenOf(n).length));

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
      '+5',
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
    // TalkBack reads each row as one sentence, without the dot.
    expect(descriptions(widget)).toEqual(
      [1, 2, 3, 4].map(i => `Assignment d${i}, d${i}-due, Course of d${i}`),
    );
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

  it('lists as many as fit its height at the text size', () => {
    // A title and "+N", then three texts a row.
    const rows = (environment: object) =>
      (texts(layout(deadlineProps, environment)).length - 2) / 3;
    // 2 × 2 cells: two rows, and the rest counted.
    const short = layout(deadlineProps, { height: 140 });
    expect(texts(short).slice(0, 2)).toEqual(['Deadlines', '+7']);
    expect(openUrls(short)).toEqual([
      'learnx://assignment',
      'learnx://assignment/d1',
      'learnx://assignment/d2',
    ]);
    // Taller: all seven in the props (two more than they hold are counted).
    expect(rows({ height: 400 })).toBe(7);
    expect(rows({ height: 300 })).toBe(6);
    // Larger text: fewer rows.
    expect(rows({ height: 300, fontScale: 1.5 })).toBe(4);
    // Always at least one.
    expect(rows({ height: 60 })).toBe(1);
  });

  it('keeps its rows at the top, leaving the space below empty', () => {
    const weighted = all(layout(deadlineProps, { height: 400 })).filter(
      n => n.type === 'Spacer' && modifier(n, 'weight') !== undefined,
    );
    expect(weighted).toEqual([]);
  });

  it('keeps to the 10 children a Glance container draws', () => {
    const props = {
      ...deadlineProps,
      deadlines: Array.from({ length: 20 }, (_, i) =>
        deadline(`m${i}`, at('23:59') + (i + 1) * DAY),
      ),
      total: 20,
    };
    const widget = layout(props, { height: 2000 });
    expect(mostChildren(widget)).toBeLessThanOrEqual(10);
    // The widget's link, then ten rows.
    expect(openUrls(widget)).toHaveLength(11);
  });

  it('puts the count of the rest at the end of the header', () => {
    const widget = layout(deadlineProps, { height: 140 });
    const header = childrenOf(widget)[0];
    expect(header.type).toBe('Row');
    expect(childrenOf(header).map(n => n.props.children)).toEqual([
      'Deadlines',
      '+7',
    ]);
    // The title takes the space left, so the count is at the end.
    expect(modifier(childrenOf(header)[0], 'weight')).toBe(1);
  });

  it("is the launcher's widget background", () => {
    const widget = layout(deadlineProps, { cornerRadius: 28 });
    expect(modifier(widget, 'cornerRadius')).toBe(28);
    expect(
      (widget.props.modifiers as { $type?: string }[]).some(
        m => m?.$type === 'appWidgetBackground',
      ),
    ).toBe(true);
    // Before Android 12
    expect(modifier(layout(deadlineProps, {}), 'cornerRadius')).toBe(16);
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
      'Open learnX to show your deadlines here',
    ]);
    expect(openUrls(english)).toEqual([]);
    expect(modifier(english, 'background')).toBe('#FFF7FA');
    expect(texts(layout(initial, { locale: 'zh-Hans-CN' }))).toEqual([
      '作业截止',
      '打开 learnX 后，这里会显示作业',
    ]);
    expect(
      texts(
        layout(
          { ...initial, deadlines: undefined, total: undefined } as never,
          {},
        ),
      ),
    ).toEqual(['Deadlines', 'Open learnX to show your deadlines here']);
  });
});

describe('Up Next on Android', () => {
  const layout = layoutOf<UpNextWidgetProps>(() =>
    require('widgets/UpNext.android'),
  );

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  it('shows the class on now and the two after it', () => {
    const widget = layout(upNextProps, { colorScheme: 'dark' });
    expect(texts(widget)).toEqual([
      'Now',
      'Course now',
      'now-time · 六教6A414',
      'Course later',
      'Tomorrow later-time',
      'Course c3',
      'c3-weekday c3-time',
    ]);
    expect(openUrls(widget)).toEqual([
      'learnx://today',
      'learnx://course/now',
      'learnx://course/later',
      'learnx://course/c3',
    ]);
    expect(descriptions(widget)).toEqual([
      'Course now, now-time, 六教6A414',
      'Course later, Tomorrow later-time',
      'Course c3, c3-weekday c3-time',
    ]);
  });

  it('lists as many later classes as fit its height', () => {
    // The widget's and the featured class's links, then one a class.
    const later = (environment: object) =>
      openUrls(layout(upNextProps, environment)).length - 2;
    // 2 × 2 cells
    expect(later({ height: 130 })).toBe(2);
    expect(later({ height: 160 })).toBe(3);
    // All five after the featured one.
    expect(later({ height: 400 })).toBe(5);
    // Larger text: fewer.
    expect(later({ height: 200, fontScale: 1.3 })).toBe(3);
    expect(later({ height: 160, fontScale: 1.3 })).toBe(2);
  });

  it('keeps to the 10 children a Glance container draws', () => {
    const props = {
      ...upNextProps,
      classes: Array.from({ length: 20 }, (_, i) =>
        klass(
          `m${i}`,
          at('08:00') + (i + 1) * DAY,
          at('09:35') + (i + 1) * DAY,
        ),
      ),
    };
    const widget = layout(props, { height: 2000 });
    expect(mostChildren(widget)).toBeLessThanOrEqual(10);
    // The widget's and the featured class's links, then ten later ones.
    expect(openUrls(widget)).toHaveLength(12);
  });

  it('lays the later classes out as the iOS layout does', () => {
    // A row each: the course, taking the space left, then when.
    const medium = layout(upNextProps, { height: 160 });
    const rows = all(medium).filter(
      n => n.type === 'Row' && openUrls(n).length === 1,
    );
    expect(rows.map(n => texts(n))).toEqual([
      ['Course later', 'Tomorrow later-time'],
      ['Course c3', 'c3-weekday c3-time'],
      ['Course c4', 'c4-weekday c4-time'],
    ]);
    expect(modifier(childrenOf(rows[0])[0], 'weight')).toBe(1);
    // No label in a medium one.
    expect(texts(medium)).not.toContain('Later');
    const fills = (node: Node) =>
      all(node).filter(
        n => n.type === 'Spacer' && modifier(n, 'weight') !== undefined,
      ).length;
    // From the top, with the space below left empty.
    expect(fills(medium)).toBe(0);
    expect(fills(layout(upNextProps, { height: 110 }))).toBe(0);
    // A tall one names them on a line of their own.
    const large = layout(upNextProps, { height: 400 });
    expect(texts(large).slice(3, 5)).toEqual(['Later', 'Course later']);
    expect(fills(large)).toBe(0);
  });

  it("dates a class after tomorrow, and leaves out what's missing", () => {
    const props = {
      ...upNextProps,
      classes: [klass('c3', at('08:00') + 2 * DAY, at('09:35') + 2 * DAY, '')],
    };
    expect(texts(layout(props, {}))).toEqual([
      'Next',
      'Course c3',
      'c3-weekday c3-time',
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
      title: '',
      noClasses: '',
      url: '',
    } as never;
    expect(texts(layout(initial, {}))).toEqual([
      'Next class',
      'Open learnX to show your classes here',
    ]);
    expect(texts(layout(initial, { locale: 'zh-Hans' }))).toEqual([
      '下一节课',
      '打开 learnX 后，这里会显示接下来的课',
    ]);
  });
});
