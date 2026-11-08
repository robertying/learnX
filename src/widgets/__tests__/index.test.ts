import { Platform } from 'react-native';
import { Assignment } from 'data/types/state';
import { updateDeadlineWidget } from 'widgets';
import iosWidget from 'widgets/DeadlinesIOS';
import androidWidget from 'widgets/DeadlinesAndroid';

// The layouts are strings after the Babel transform; their @expo/ui imports
// are only for type checking.
jest.mock('@expo/ui/swift-ui', () => ({}));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({}));
jest.mock('@expo/ui/jetpack-compose', () => ({}));
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({}));

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
    jest.clearAllMocks();
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

  it('empties the widget when there are no assignments', () => {
    Platform.OS = 'android';
    updateDeadlineWidget([], options);

    expect(androidWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ deadlines: [], total: 0 }),
    );
  });
});
