import { FailReason } from 'thu-learn-lib';
import courses from 'data/reducers/courses';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
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
      items: [],
      names: {},
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

  it('stores the courses and indexes names on success', () => {
    const state = courses(
      { ...initial, fetching: true },
      action(GET_COURSES_FOR_SEMESTER_SUCCESS, [
        course('a'),
        course('b'),
        course('c'),
      ]),
    );
    expect(state.fetching).toBe(false);
    expect(state.error).toBeNull();
    expect(ids(state)).toEqual(['a', 'b', 'c']);
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
});
