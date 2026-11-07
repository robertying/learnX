import { FailReason } from 'thu-learn-lib';
import courses from 'data/reducers/courses';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  SET_COURSE_ORDER,
  SET_HIDE_COURSE,
} from 'data/types/constants';
import { Course, CoursesState } from 'data/types/state';
import { action, INIT } from '../../../../jest/actions';

const course = (id: string) =>
  ({ id, name: `Course ${id}`, teacherName: `Teacher ${id}` }) as Course;

const ids = (state: CoursesState) => state.items.map(c => c.id);

describe('courses reducer', () => {
  const initial = courses(undefined, INIT);

  it('has an empty initial state', () => {
    expect(initial).toEqual({
      fetching: false,
      hidden: [],
      items: [],
      names: {},
      order: [],
    });
  });

  it('returns the same state for unknown actions', () => {
    expect(courses(initial, INIT)).toBe(initial);
  });

  it('marks a request as fetching and clears the error', () => {
    expect(
      courses(
        { ...initial, error: FailReason.NOT_LOGGED_IN },
        action(GET_COURSES_FOR_SEMESTER_REQUEST),
      ),
    ).toMatchObject({ fetching: true, error: null });
  });

  it('applies the saved order and indexes names on success', () => {
    const state = courses(
      { ...initial, fetching: true, order: ['c', 'a'] },
      action(GET_COURSES_FOR_SEMESTER_SUCCESS, [
        course('a'),
        course('b'),
        course('c'),
      ]),
    );
    expect(state.fetching).toBe(false);
    expect(state.error).toBeNull();
    expect(ids(state)).toEqual(['c', 'a', 'b']);
    expect(state.names).toEqual({
      a: { name: 'Course a', teacherName: 'Teacher a' },
      b: { name: 'Course b', teacherName: 'Teacher b' },
      c: { name: 'Course c', teacherName: 'Teacher c' },
    });
  });

  it('records the reason on failure', () => {
    expect(
      courses(
        { ...initial, fetching: true },
        action(GET_COURSES_FOR_SEMESTER_FAILURE, {
          reason: FailReason.INVALID_RESPONSE,
        }),
      ),
    ).toMatchObject({ fetching: false, error: FailReason.INVALID_RESPONSE });
  });

  it('hides and unhides courses', () => {
    let state = courses(
      initial,
      action(SET_HIDE_COURSE, { courseId: 'a', flag: true }),
    );
    state = courses(
      state,
      action(SET_HIDE_COURSE, { courseId: 'b', flag: true }),
    );
    expect(state.hidden).toEqual(['a', 'b']);
    expect(
      courses(state, action(SET_HIDE_COURSE, { courseId: 'a', flag: false }))
        .hidden,
    ).toEqual(['b']);
  });

  it('saves a new order and reorders the current items', () => {
    const loaded = courses(
      initial,
      action(GET_COURSES_FOR_SEMESTER_SUCCESS, [
        course('a'),
        course('b'),
        course('c'),
      ]),
    );
    const state = courses(loaded, action(SET_COURSE_ORDER, ['b', 'c']));
    expect(state.order).toEqual(['b', 'c']);
    expect(ids(state)).toEqual(['b', 'c', 'a']);
  });
});
