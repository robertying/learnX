import {
  CHECK_MS,
  STALE_MS,
  createNotifier,
  dueAt,
  shownContent,
} from '../notifications.cjs';

type Shown = {
  options: { title: string; subtitle?: string; body: string };
  listeners: Map<string, () => void>;
  show: jest.Mock;
};

/** A notifier on fake timers whose notifications only record themselves. */
const setUp = (platform = 'win32') => {
  jest.useFakeTimers({ now: new Date('2026-11-16T08:00:00Z') });
  const shown: Shown[] = [];
  const onClick = jest.fn();
  const notifier = createNotifier({
    platform,
    onClick,
    createNotification: options => {
      const listeners = new Map<string, () => void>();
      const notification = {
        options,
        listeners,
        show: jest.fn(),
        on: (event: string, listener: () => void) => {
          listeners.set(event, listener);
        },
      };
      shown.push(notification);
      return notification;
    },
  });
  return { notifier, shown, onClick };
};

const content = {
  title: 'Homework 6',
  subtitle: 'Probability',
  body: 'Due in 1 hour',
  data: { type: 'assignment', id: 'a1' },
};

describe('dueAt', () => {
  it('reads dates, intervals and right away', () => {
    expect(dueAt(null, 1000)).toBeNull();
    expect(dueAt({ channelId: 'content' }, 1000)).toBeNull();
    expect(dueAt({ type: 'date', date: 5000 }, 1000)).toBe(5000);
    expect(dueAt({ type: 'date', date: '2026-11-16T08:00:00Z' }, 0)).toBe(
      Date.parse('2026-11-16T08:00:00Z'),
    );
    expect(dueAt({ type: 'date', date: 'nonsense' }, 0)).toBeNull();
    expect(dueAt({ type: 'timeInterval', seconds: 60 }, 1000)).toBe(61_000);
    expect(dueAt({ type: 'daily' }, 1000)).toBeNull();
  });
});

describe('shownContent', () => {
  it('keeps the subtitle on macOS and puts the course first elsewhere', () => {
    expect(shownContent(content, 'darwin')).toEqual({
      title: 'Homework 6',
      subtitle: 'Probability',
      body: 'Due in 1 hour',
    });
    expect(shownContent(content, 'win32')).toEqual({
      title: 'Homework 6',
      body: 'Probability\nDue in 1 hour',
    });
    expect(shownContent({}, 'linux')).toEqual({ title: '', body: '' });
  });
});

describe('createNotifier', () => {
  it('posts right away without a trigger', () => {
    const { notifier, shown } = setUp();
    expect(notifier.schedule({ identifier: 'n', content, trigger: null })).toBe(
      'n',
    );
    expect(shown).toHaveLength(1);
    expect(shown[0].show).toHaveBeenCalled();
    expect(shown[0].options.body).toBe('Probability\nDue in 1 hour');
    expect(notifier.list()).toEqual([]);
  });

  it('refuses a request without an identifier', () => {
    const { notifier } = setUp();
    expect(() => notifier.schedule({} as never)).toThrow('identifier');
  });

  it('keeps a reminder until its time, checking at least every minute', () => {
    const { notifier, shown } = setUp();
    const at = Date.now() + 90 * 60 * 1000;
    notifier.schedule({
      identifier: 'r',
      content,
      trigger: { type: 'date', date: at },
    });
    expect(notifier.list()).toEqual([
      { identifier: 'r', content, trigger: { type: 'date', value: at } },
    ]);
    jest.advanceTimersByTime(CHECK_MS);
    expect(shown).toHaveLength(0);
    jest.advanceTimersByTime(90 * 60 * 1000 - CHECK_MS);
    expect(shown).toHaveLength(1);
    expect(notifier.list()).toEqual([]);
  });

  it('replaces a reminder scheduled again, and cancels one', () => {
    const { notifier, shown } = setUp();
    const trigger = { type: 'timeInterval', seconds: 60 };
    notifier.schedule({ identifier: 'r', content, trigger });
    notifier.schedule({
      identifier: 'r',
      content: { ...content, body: 'Changed' },
      trigger,
    });
    notifier.schedule({ identifier: 'other', content, trigger });
    expect(notifier.list().map(n => n.content.body)).toEqual([
      'Changed',
      'Due in 1 hour',
    ]);
    notifier.cancel('other');
    jest.advanceTimersByTime(60_000);
    expect(shown.map(n => n.options.body)).toEqual(['Probability\nChanged']);
  });

  it('posts a reminder the computer slept through, unless it is stale', () => {
    const { notifier, shown } = setUp();
    notifier.schedule({
      identifier: 'soon',
      content,
      trigger: { type: 'timeInterval', seconds: 60 },
    });
    notifier.schedule({
      identifier: 'stale',
      content: { ...content, body: 'Stale' },
      trigger: { type: 'timeInterval', seconds: 120 },
    });
    // Asleep: the clock moves on but the timers don't run.
    jest.setSystemTime(Date.now() + 120_000 + STALE_MS + 1);
    jest.spyOn(Date, 'now');
    notifier.check();
    expect(shown).toHaveLength(0);
    expect(notifier.list()).toEqual([]);
  });

  it('posts what came due when checked after waking', () => {
    const { notifier, shown } = setUp();
    notifier.schedule({
      identifier: 'r',
      content,
      trigger: { type: 'timeInterval', seconds: 60 },
    });
    jest.setSystemTime(Date.now() + 10 * 60_000);
    notifier.check();
    expect(shown).toHaveLength(1);
  });

  it('tells which notification was clicked, and forgets closed ones', () => {
    const { notifier, shown, onClick } = setUp();
    const request = { identifier: 'n', content, trigger: null };
    notifier.schedule(request);
    shown[0].listeners.get('click')!();
    expect(onClick).toHaveBeenCalledWith(request);
    notifier.schedule({ ...request, identifier: 'm' });
    expect(() => shown[1].listeners.get('close')!()).not.toThrow();
    expect(() => shown[1].listeners.get('failed')!()).not.toThrow();
  });

  it('drops every reminder on clear', () => {
    const { notifier, shown } = setUp('darwin');
    notifier.schedule({
      identifier: 'r',
      content,
      trigger: { type: 'timeInterval', seconds: 60 },
    });
    notifier.clear();
    jest.advanceTimersByTime(120_000);
    expect(shown).toHaveLength(0);
  });
});
