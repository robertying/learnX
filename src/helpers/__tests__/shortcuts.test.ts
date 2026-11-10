import { Assignment } from 'data/types/state';
import {
  clearShortcuts,
  saveUpcomingClasses,
  saveUpcomingDeadlines,
} from 'helpers/shortcuts';
import { upcomingDeadlines } from 'helpers/widgetDeadlines';

jest.mock('../../../modules/spotlight', () => ({
  __esModule: true,
  default: {
    setUpcomingDeadlines: jest.fn(),
    setUpcomingClasses: jest.fn(),
  },
}));
jest.mock('helpers/widgetDeadlines', () => ({
  upcomingDeadlines: jest.fn(),
}));

const Spotlight = jest.requireMock('../../../modules/spotlight').default as {
  setUpcomingDeadlines: jest.Mock;
  setUpcomingClasses: jest.Mock;
};

const deadline = (title: string) => ({
  title,
  courseName: 'Calculus',
  deadline: 1,
});
const deadlinesAre = (...titles: string[]) =>
  jest
    .mocked(upcomingDeadlines)
    .mockReturnValue({ deadlines: titles.map(deadline) } as never);

const cls = (courseName: string) => ({
  courseName,
  location: 'Room 1',
  start: 1,
  end: 2,
  // Dropped: the intent only reads the four fields above.
  extra: true,
});

const filters = { hiddenCourses: ['hidden'], archived: ['archived'] };
const assignments = [] as Assignment[];

// Each case starts from empty intents, without counting that save.
beforeEach(() => {
  deadlinesAre();
  clearShortcuts();
  Spotlight.setUpcomingDeadlines.mockClear();
  Spotlight.setUpcomingClasses.mockClear();
});

it('saves up to 20 open deadlines, without hidden or archived ones', () => {
  deadlinesAre('A');
  saveUpcomingDeadlines(assignments, filters);

  expect(upcomingDeadlines).toHaveBeenLastCalledWith(assignments, {
    ...filters,
    limit: 20,
  });
  expect(Spotlight.setUpcomingDeadlines).toHaveBeenCalledWith([deadline('A')]);
});

it('skips deadlines that have not changed', () => {
  deadlinesAre('A');
  saveUpcomingDeadlines(assignments, filters);
  saveUpcomingDeadlines(assignments, filters);
  deadlinesAre('A', 'B');
  saveUpcomingDeadlines(assignments, filters);

  expect(Spotlight.setUpcomingDeadlines.mock.calls).toEqual([
    [[deadline('A')]],
    [[deadline('A'), deadline('B')]],
  ]);
});

it('saves the next classes with only the fields the intent reads', () => {
  saveUpcomingClasses([cls('Physics')] as never);
  saveUpcomingClasses([cls('Physics')] as never);

  expect(Spotlight.setUpcomingClasses.mock.calls).toEqual([
    [[{ courseName: 'Physics', location: 'Room 1', start: 1, end: 2 }]],
  ]);
});

it('tries again after the native module throws', () => {
  deadlinesAre('A');
  Spotlight.setUpcomingDeadlines.mockImplementationOnce(() => {
    throw new Error('UserDefaults');
  });
  saveUpcomingDeadlines(assignments, filters);
  saveUpcomingDeadlines(assignments, filters);

  expect(Spotlight.setUpcomingDeadlines).toHaveBeenLastCalledWith([
    deadline('A'),
  ]);
  expect(Spotlight.setUpcomingDeadlines).toHaveBeenCalledTimes(2);
});

it('empties both intents', () => {
  deadlinesAre('A');
  saveUpcomingDeadlines(assignments, filters);
  saveUpcomingClasses([cls('Physics')] as never);

  deadlinesAre();
  clearShortcuts();

  expect(Spotlight.setUpcomingDeadlines).toHaveBeenLastCalledWith([]);
  expect(Spotlight.setUpcomingClasses).toHaveBeenLastCalledWith([]);
});
