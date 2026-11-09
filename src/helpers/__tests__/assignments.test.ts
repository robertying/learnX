import dayjs from 'dayjs';
import { Assignment } from 'data/types/state';
import { deadlineText, sortAssignments } from 'helpers/assignments';

const assignment = (id: string, deadline: string) =>
  ({ id, deadline }) as unknown as Assignment;

const ids = (assignments: Assignment[]) => assignments.map(a => a.id);

describe('sortAssignments', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-03-15T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts upcoming assignments first, earliest deadline first', () => {
    const sorted = sortAssignments([
      assignment('c', '2026-03-20T00:00:00Z'),
      assignment('a', '2026-03-16T00:00:00Z'),
      assignment('b', '2026-03-18T00:00:00Z'),
    ]);
    expect(ids(sorted)).toEqual(['a', 'b', 'c']);
  });

  it('puts past assignments after upcoming ones, latest deadline first', () => {
    const sorted = sortAssignments([
      assignment('old', '2026-03-01T00:00:00Z'),
      assignment('soon', '2026-03-16T00:00:00Z'),
      assignment('recent', '2026-03-14T00:00:00Z'),
      assignment('later', '2026-04-01T00:00:00Z'),
    ]);
    expect(ids(sorted)).toEqual(['soon', 'later', 'recent', 'old']);
  });

  it('treats a deadline equal to now as past', () => {
    const sorted = sortAssignments([
      assignment('now', '2026-03-15T12:00:00Z'),
      assignment('earlier', '2026-03-15T11:00:00Z'),
      assignment('next', '2026-03-15T12:00:01Z'),
    ]);
    expect(ids(sorted)).toEqual(['next', 'now', 'earlier']);
  });

  it('breaks deadline ties by id, ascending when upcoming and descending when past', () => {
    const sorted = sortAssignments([
      assignment('u2', '2026-03-20T00:00:00Z'),
      assignment('p1', '2026-03-10T00:00:00Z'),
      assignment('u1', '2026-03-20T00:00:00Z'),
      assignment('p2', '2026-03-10T00:00:00Z'),
    ]);
    expect(ids(sorted)).toEqual(['u1', 'u2', 'p2', 'p1']);
  });

  it('does not mutate its input', () => {
    const input = [
      assignment('b', '2026-03-20T00:00:00Z'),
      assignment('a', '2026-03-16T00:00:00Z'),
    ];
    sortAssignments(input);
    expect(ids(input)).toEqual(['b', 'a']);
  });

  it('handles an empty list', () => {
    expect(sortAssignments([])).toEqual([]);
  });
});

describe('deadlineText', () => {
  const now = '2026-03-15T12:00:00Z';

  it('counts down to an upcoming deadline', () => {
    expect(deadlineText('2026-03-18T12:00:00Z', now)).toBe('due in 3 days');
  });

  it('says how long ago a past deadline closed', () => {
    expect(deadlineText('2026-03-15T10:00:00Z', now)).toBe(
      'closed 2 hours ago',
    );
  });

  it('follows the time it is given, so a later minute updates the text', () => {
    const deadline = '2026-03-15T12:30:00Z';
    expect(deadlineText(deadline, now)).toBe('due in 30 minutes');
    expect(deadlineText(deadline, '2026-03-15T12:45:00Z')).toBe(
      'closed 15 minutes ago',
    );
  });
});

describe('deadlineText for a deadline far away', () => {
  it('shows the date instead of "due in 73 years"', () => {
    const now = dayjs('2026-11-09T12:00:00+08:00');
    expect(deadlineText('2099-12-31T23:59:00+08:00', now)).not.toMatch(/year/);
    expect(deadlineText('2099-12-31T23:59:00+08:00', now)).toMatch(/2099/);
    expect(deadlineText('2027-03-01T23:59:00+08:00', now)).toMatch(/month/);
  });
});
