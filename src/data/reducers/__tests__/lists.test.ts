import { FailReason } from 'thu-learn-lib';
import assignments from 'data/reducers/assignments';
import files from 'data/reducers/files';
import * as C from 'data/types/constants';
import { action, INIT } from '../../../../jest/actions';

type Item = { id: string; courseId: string; deadline?: string };

/**
 * files and assignments handle the same kinds of actions under
 * different names; this describes each one so they share one set of tests.
 */
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
  {
    name: 'assignments',
    reducer: assignments as (state: any, a: never) => any,
    all: [
      C.GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
      C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
      C.GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
    ],
    course: [
      C.GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
      C.GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
      C.GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
    ],
    coursePayload: (courseId: string, items: Item[]) => ({
      courseId,
      assignments: items,
    }),
  },
];

// Deadlines far in the future keep assignment order independent of today
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

describe('assignments reducer', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-03-15T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const assignment = (id: string, courseId: string, deadline: string) => ({
    id,
    courseId,
    deadline,
  });

  it('starts with no pending assignment data', () => {
    expect(assignments(undefined, INIT).pendingAssignmentData).toBeNull();
  });

  it('keeps the server order when fetching all courses', () => {
    const items = [
      assignment('late', 'a', '2026-04-01T00:00:00Z'),
      assignment('soon', 'b', '2026-03-16T00:00:00Z'),
    ];
    const state = assignments(
      undefined,
      action(C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS, items),
    );
    expect(state.items.map(i => i.id)).toEqual(['late', 'soon']);
  });

  it('re-sorts all items after fetching one course', () => {
    let state = assignments(
      undefined,
      action(C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS, [
        assignment('a-old', 'a', '2026-03-20T00:00:00Z'),
        assignment('b1', 'b', '2026-03-18T00:00:00Z'),
        assignment('b-past', 'b', '2026-03-01T00:00:00Z'),
      ]),
    );
    state = assignments(
      state,
      action(C.GET_ASSIGNMENTS_FOR_COURSE_SUCCESS, {
        courseId: 'a',
        assignments: [
          assignment('a-new', 'a', '2026-03-16T00:00:00Z'),
          assignment('a-past', 'a', '2026-03-10T00:00:00Z'),
        ],
      }),
    );
    expect(state.items.map(i => i.id)).toEqual([
      'a-new',
      'b1',
      'a-past',
      'b-past',
    ]);
  });

  it('stores pending assignment data', () => {
    const data = { assignmentId: 'x', content: 'draft' };
    const state = assignments(
      undefined,
      action(C.SET_PENDING_ASSIGNMENT_DATA, data),
    );
    expect(state.pendingAssignmentData).toBe(data);
    expect(
      assignments(state, action(C.SET_PENDING_ASSIGNMENT_DATA, null))
        .pendingAssignmentData,
    ).toBeNull();
  });
});
