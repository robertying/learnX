import { Assignment } from 'data/types/state';
import { sortAssignments } from 'helpers/assignments';

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
