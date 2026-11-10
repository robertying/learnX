import { Platform } from 'react-native';
import { Assignment } from 'data/types/state';
import { updateDeadlineWidget, updateUpNextWidget } from 'widgets';
import iosWidget from 'widgets/DeadlinesIOS';
import androidWidget from 'widgets/DeadlinesAndroid';
import iosUpNext from 'widgets/UpNextIOS';
import androidUpNext from 'widgets/UpNextAndroid';

const assignment = (id: string, deadline: string) =>
  ({
    id,
    deadline,
    title: `Assignment ${id}`,
    courseId: 'course',
    courseName: 'Course',
    submitted: false,
  }) as Assignment;

const assignments = [
  assignment('b', '2026-03-17T00:00:00Z'),
  assignment('a', '2026-03-16T00:00:00Z'),
];
const options = { hiddenCourses: [], archived: [] };

describe('updateDeadlineWidget', () => {
  const os = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-03-15T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = os;
  });

  it('gives iOS an entry now and one as each deadline passes', () => {
    Platform.OS = 'ios';
    updateDeadlineWidget(assignments, options);

    const [entries] = jest.mocked(iosWidget.updateTimeline).mock.calls[0];
    expect(entries.map(e => e.date.toISOString())).toEqual([
      '2026-03-15T12:00:00.000Z',
      '2026-03-16T00:00:00.000Z',
      '2026-03-17T00:00:00.000Z',
    ]);
    expect(entries.map(e => e.props.deadlines.map(d => d.id))).toEqual([
      ['a', 'b'],
      ['b'],
      [],
    ]);
    expect(entries[0].props).toMatchObject({
      total: 2,
      title: 'Deadlines',
      empty: 'Nothing due',
    });
    expect(androidWidget.updateSnapshot).not.toHaveBeenCalled();
  });

  it('gives Android a snapshot with formatted due times', () => {
    Platform.OS = 'android';
    updateDeadlineWidget(assignments, options);

    const [props] = jest.mocked(androidWidget.updateSnapshot).mock.calls[0];
    expect(props.deadlines.map(d => d.id)).toEqual(['a', 'b']);
    expect(props.deadlines[0].due).toMatch(/^Mar 16, \d\d:\d\d$/);
    expect(iosWidget.updateTimeline).not.toHaveBeenCalled();
  });

  it('gives Android more deadlines than it shows, to drop passed ones', () => {
    Platform.OS = 'android';
    const many = Array.from({ length: 12 }, (_, i) =>
      assignment(
        `a${i}`,
        `2026-03-${String(16 + i).padStart(2, '0')}T00:00:00Z`,
      ),
    );
    updateDeadlineWidget(many, options);

    const [props] = jest.mocked(androidWidget.updateSnapshot).mock.calls[0];
    expect(props.deadlines).toHaveLength(10);
    expect(props.total).toBe(12);
  });

  it('empties the widget when there are no assignments', () => {
    Platform.OS = 'android';
    updateDeadlineWidget([], options);

    expect(androidWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ deadlines: [], total: 0 }),
    );
  });
});

describe('updateUpNextWidget', () => {
  const os = Platform.OS;
  const at = (time: string) =>
    new Date(`2026-03-16T${time}:00+08:00`).getTime();
  const classes = [
    {
      key: 'calculus',
      courseName: 'Calculus',
      location: '六教6A414',
      start: at('08:00'),
      end: at('09:35'),
    },
    {
      key: 'physics',
      courseName: 'Physics',
      location: '',
      start: at('13:30'),
      end: at('15:05'),
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-03-15T20:00:00+08:00') });
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = os;
    // Clears what was last sent, so each test sends.
    updateUpNextWidget();
  });

  it('gives iOS the same props at each class start and end and deadline', () => {
    Platform.OS = 'ios';
    updateUpNextWidget(classes, assignments, options);

    const [entries] = jest.mocked(iosUpNext.updateTimeline).mock.calls[0];
    expect(entries.map(e => e.date.getTime())).toEqual([
      new Date('2026-03-15T20:00:00+08:00').getTime(),
      // Also assignment a's deadline (00:00Z).
      at('08:00'),
      at('09:35'),
      at('13:30'),
      at('15:05'),
      new Date('2026-03-17T00:00:00Z').getTime(),
    ]);
    expect(new Set(entries.map(e => e.props)).size).toBe(1);
    expect(entries[0].props).toMatchObject({
      title: 'Up Next',
      url: 'learnx://today',
      classes: [
        { courseName: 'Calculus', time: '08:00–09:35', day: 'Mon 3/16' },
        { courseName: 'Physics', time: '13:30–15:05' },
      ],
    });
    expect(entries[0].props.deadlines.map(d => d.id)).toEqual(['a', 'b']);
  });

  it('gives Android a snapshot, once for the same props', () => {
    Platform.OS = 'android';
    updateUpNextWidget(classes, assignments, options);
    updateUpNextWidget(classes, assignments, options);

    expect(androidUpNext.updateSnapshot).toHaveBeenCalledTimes(1);
    expect(iosUpNext.updateTimeline).not.toHaveBeenCalled();
  });

  it('empties the widget when given nothing', () => {
    Platform.OS = 'android';
    updateUpNextWidget(classes, assignments, options);
    updateUpNextWidget();

    expect(androidUpNext.updateSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ classes: [], deadlines: [] }),
    );
  });
});
