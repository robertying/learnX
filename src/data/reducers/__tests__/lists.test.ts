import { FailReason } from 'thu-learn-lib';
import files from 'data/reducers/files';
import * as C from 'data/types/constants';
import { action, INIT } from '../../../../jest/actions';

type Item = { id: string; courseId: string; deadline?: string };

/** The actions the files reducer handles, described so the tests read generically. */
const cases = [
  {
    name: 'files',
    reducer: files as (state: any, a: never) => any,
    all: [
      C.GET_ALL_FILES_FOR_COURSES_REQUEST,
      C.GET_ALL_FILES_FOR_COURSES_SUCCESS,
      C.GET_ALL_FILES_FOR_COURSES_FAILURE,
    ],
    course: [
      C.GET_FILES_FOR_COURSE_REQUEST,
      C.GET_FILES_FOR_COURSE_SUCCESS,
      C.GET_FILES_FOR_COURSE_FAILURE,
    ],
    coursePayload: (courseId: string, items: Item[]) => ({
      courseId,
      files: items,
    }),
  },
];

const item = (id: string, courseId: string): Item => ({
  id,
  courseId,
  deadline: `2999-01-0${id.slice(-1)}T00:00:00Z`,
});

describe.each(cases)('$name reducer', c => {
  const initial = c.reducer(undefined, INIT);

  it('has an empty initial state', () => {
    expect(initial).toMatchObject({
      fetching: false,
      items: [],
    });
  });

  it('returns the same state for unknown actions', () => {
    expect(c.reducer(initial, INIT)).toBe(initial);
  });

  describe('fetching all courses', () => {
    const [request, success, failure] = c.all;

    it('marks the request as fetching and clears the error', () => {
      expect(
        c.reducer(
          { ...initial, error: FailReason.NOT_LOGGED_IN },
          action(request),
        ),
      ).toMatchObject({ fetching: true, error: null });
    });

    it('replaces all items on success', () => {
      const items = [item('n1', 'c1'), item('n2', 'c2')];
      const state = c.reducer(
        { ...initial, fetching: true, items: [item('old', 'c3')] },
        action(success, items),
      );
      expect(state).toMatchObject({ fetching: false, error: null, items });
    });

    it('records the reason on failure and keeps the items', () => {
      const items = [item('n1', 'c1')];
      expect(
        c.reducer(
          { ...initial, fetching: true, items },
          action(failure, { reason: FailReason.INVALID_RESPONSE }),
        ),
      ).toMatchObject({
        fetching: false,
        error: FailReason.INVALID_RESPONSE,
        items,
      });
    });
  });

  describe('fetching one course', () => {
    const [request, success, failure] = c.course;

    it('marks the request as fetching and clears the error', () => {
      expect(
        c.reducer(
          { ...initial, error: FailReason.NOT_LOGGED_IN },
          action(request),
        ),
      ).toMatchObject({ fetching: true, error: null });
    });

    it("replaces only that course's items on success", () => {
      const state = c.reducer(
        {
          ...initial,
          fetching: true,
          items: [item('a1', 'a'), item('b1', 'b'), item('a2', 'a')],
        },
        action(success, c.coursePayload('a', [item('a3', 'a')])),
      );
      expect(state.fetching).toBe(false);
      expect(state.error).toBeNull();
      expect(state.items.map((i: Item) => i.id).sort()).toEqual(['a3', 'b1']);
    });

    it('records the reason on failure', () => {
      expect(
        c.reducer(
          { ...initial, fetching: true },
          action(failure, { reason: FailReason.OPERATION_FAILED }),
        ),
      ).toMatchObject({ fetching: false, error: FailReason.OPERATION_FAILED });
    });
  });
});
