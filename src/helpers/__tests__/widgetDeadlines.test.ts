import { Assignment } from 'data/types/state';
import { deadlineTimeline, upcomingDeadlines } from 'helpers/widgetDeadlines';

const now = Date.parse('2026-03-15T12:00:00Z');

const assignment = (
  id: string,
  deadline: string,
  extra: Partial<Assignment> = {},
) =>
  ({
    id,
    deadline,
    title: `Assignment ${id}`,
    courseId: 'course',
    courseName: 'Course',
    submitted: false,
    ...extra,
  }) as Assignment;

const ids = (result: ReturnType<typeof upcomingDeadlines>) =>
  result.deadlines.map(d => d.id);

const options = { hiddenCourses: [], archived: [], now };

describe('upcomingDeadlines', () => {
  it('lists future deadlines earliest first, as timestamps', () => {
    const result = upcomingDeadlines(
      [
        assignment('later', '2026-03-20T00:00:00Z'),
        assignment('past', '2026-03-14T00:00:00Z'),
        assignment('soon', '2026-03-16T00:00:00Z'),
        assignment('now', '2026-03-15T12:00:00Z'),
      ],
      options,
    );
    expect(ids(result)).toEqual(['soon', 'later']);
    expect(result.deadlines[0]).toEqual({
      id: 'soon',
      title: 'Assignment soon',
      courseName: 'Course',
      deadline: Date.parse('2026-03-16T00:00:00Z'),
    });
    expect(result.total).toBe(2);
  });

  it('leaves out submitted, archived and hidden-course assignments', () => {
    const result = upcomingDeadlines(
      [
        assignment('done', '2026-03-16T00:00:00Z', { submitted: true }),
        assignment('archived', '2026-03-16T00:00:00Z'),
        assignment('hidden', '2026-03-16T00:00:00Z', { courseId: 'h' }),
        assignment('open', '2026-03-17T00:00:00Z'),
      ],
      { ...options, hiddenCourses: ['h'], archived: ['archived'] },
    );
    expect(ids(result)).toEqual(['open']);
  });

  it('keeps the first `limit` and counts the rest', () => {
    const result = upcomingDeadlines(
      ['b', 'a', 'c'].map(id => assignment(id, '2026-03-16T00:00:00Z')),
      { ...options, limit: 2 },
    );
    expect(ids(result)).toEqual(['a', 'b']);
    expect(result.total).toBe(3);
  });
});

describe('deadlineTimeline', () => {
  it('starts now and adds an entry at each upcoming deadline', () => {
    const timeline = deadlineTimeline(
      [
        assignment('b', '2026-03-17T00:00:00Z'),
        assignment('a', '2026-03-16T00:00:00Z'),
        assignment('a2', '2026-03-16T00:00:00Z'),
      ],
      options,
    );
    expect(timeline.map(e => e.date)).toEqual([
      now,
      Date.parse('2026-03-16T00:00:00Z'),
      Date.parse('2026-03-17T00:00:00Z'),
    ]);
    expect(timeline.map(e => e.deadlines.deadlines.map(d => d.id))).toEqual([
      ['a', 'a2', 'b'],
      ['b'],
      [],
    ]);
  });

  it('keeps to the given number of entries', () => {
    const timeline = deadlineTimeline(
      ['a', 'b', 'c'].map((id, i) =>
        assignment(id, `2026-03-1${6 + i}T00:00:00Z`),
      ),
      { ...options, entries: 2 },
    );
    expect(timeline).toHaveLength(2);
  });
});
