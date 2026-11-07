import { buildICS, ICSEvent } from 'helpers/ics';

// jest.config.js pins TZ to Asia/Shanghai (UTC+8)
const event = (overrides: Partial<ICSEvent> = {}): ICSEvent => ({
  uid: 'event-1',
  title: 'Homework 1',
  startDate: new Date('2026-03-16T01:00:00Z'),
  endDate: new Date('2026-03-16T02:30:00Z'),
  ...overrides,
});

const lines = (ics: string) => ics.split('\r\n');

describe('buildICS', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-03-15T12:34:56.789Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a calendar with a timed event', () => {
    expect(buildICS('Assignments', [event()])).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//learnX//learnX//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Assignments',
        'BEGIN:VEVENT',
        'UID:event-1',
        'DTSTAMP:20260315T123456Z',
        'DTSTART:20260316T010000Z',
        'DTEND:20260316T023000Z',
        'SUMMARY:Homework 1',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
  });

  it('builds an empty calendar', () => {
    expect(lines(buildICS('Empty', []))).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//learnX//learnX//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Empty',
      'END:VCALENDAR',
      '',
    ]);
  });

  it('uses local dates with an exclusive end for all-day events', () => {
    const ics = buildICS('Courses', [
      event({
        allDay: true,
        // 2026-03-16 07:00 and 2026-03-17 07:00 in UTC+8
        startDate: new Date('2026-03-15T23:00:00Z'),
        endDate: new Date('2026-03-16T23:00:00Z'),
      }),
    ]);
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'DTSTART;VALUE=DATE:20260316',
        'DTEND;VALUE=DATE:20260318',
      ]),
    );
    expect(ics).not.toMatch(/DTSTART:/);
  });

  it('escapes backslashes, semicolons, commas and newlines in text', () => {
    const ics = buildICS('a,b;c', [
      event({
        uid: 'id;1',
        title: 'C:\\path, part 1; part 2',
        notes: 'line 1\nline 2\r\nline 3',
      }),
    ]);
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'X-WR-CALNAME:a\\,b\\;c',
        'UID:id\\;1',
        'SUMMARY:C:\\\\path\\, part 1\\; part 2',
        'DESCRIPTION:line 1\\nline 2\\nline 3',
      ]),
    );
  });

  it('joins multi-line locations into one line', () => {
    const ics = buildICS('Courses', [
      event({ location: '  Building 6A \n\n Room 101\r\n' }),
    ]);
    expect(lines(ics)).toContain('LOCATION:Building 6A\\, Room 101');
  });

  it('strips whitespace from URLs', () => {
    const ics = buildICS('Courses', [
      event({ url: 'https://example.com/a b\n/c' }),
    ]);
    expect(lines(ics)).toContain('URL:https://example.com/ab/c');
  });

  it('omits empty optional fields', () => {
    const ics = buildICS('Courses', [
      event({ location: null, notes: '', url: null, alarmOffsets: [] }),
    ]);
    expect(ics).not.toMatch(/LOCATION|DESCRIPTION|URL|VALARM/);
  });

  it('adds one display alarm per offset', () => {
    const ics = buildICS('Assignments', [
      event({ alarmOffsets: [-30, 15, -0.6] }),
    ]);
    const alarm = (trigger: string) => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Homework 1',
      `TRIGGER:${trigger}`,
      'END:VALARM',
    ];
    const all = lines(ics);
    const start = all.indexOf('BEGIN:VALARM');
    expect(all.slice(start, start + 15)).toEqual([
      ...alarm('-PT30M'),
      ...alarm('PT15M'),
      ...alarm('-PT1M'),
    ]);
  });

  it('folds lines longer than 75 octets', () => {
    const ics = buildICS('Assignments', [event({ title: 'x'.repeat(100) })]);
    const summary = lines(ics).filter(
      (l, i, all) =>
        l.startsWith('SUMMARY:') ||
        (l.startsWith(' ') && all[i - 1]?.startsWith('SUMMARY:')),
    );
    expect(summary).toEqual([
      'SUMMARY:' + 'x'.repeat(67),
      ' ' + 'x'.repeat(33),
    ]);
  });

  it('folds by UTF-8 octets without splitting characters', () => {
    // 8 octets of "SUMMARY:" plus 3 octets per CJK character
    const ics = buildICS('Assignments', [event({ title: '作业'.repeat(15) })]);
    const all = lines(ics);
    const i = all.findIndex(l => l.startsWith('SUMMARY:'));
    expect(all[i]).toBe('SUMMARY:' + '作业'.repeat(11));
    expect(all[i + 1]).toBe(' ' + '作业'.repeat(4));
    for (const line of all) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
