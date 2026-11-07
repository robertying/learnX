import { CoursesAction } from 'data/types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  SET_COURSE_ORDER,
  SET_HIDE_COURSE,
} from 'data/types/constants';
import { CoursesState } from 'data/types/state';
import { sortByOrder } from 'helpers/reorder';

export default function courses(
  state: CoursesState = {
    fetching: false,
    hidden: [],
    items: [],
    names: {},
    order: [],
  },
  action: CoursesAction,
): CoursesState {
  switch (action.type) {
    case GET_COURSES_FOR_SEMESTER_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_COURSES_FOR_SEMESTER_SUCCESS: {
      const orderedCourses = sortByOrder(action.payload, state.order);
      return {
        ...state,
        fetching: false,
        items: orderedCourses,
        names: orderedCourses.reduce(
          (prev, curr) => ({
            ...prev,
            [curr.id]: {
              name: curr.name,
              teacherName: curr.teacherName,
            },
          }),
          {},
        ),
        error: null,
      };
    }
    case GET_COURSES_FOR_SEMESTER_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case SET_HIDE_COURSE:
      if (action.payload.flag) {
        return {
          ...state,
          hidden: [...state.hidden, action.payload.courseId],
        };
      } else {
        return {
          ...state,
          hidden: state.hidden.filter(item => item !== action.payload.courseId),
        };
      }
    case SET_COURSE_ORDER: {
      const orderedCourses = sortByOrder(state.items, action.payload);
      return {
        ...state,
        order: action.payload,
        items: orderedCourses,
      };
    }
    default:
      return state;
  }
}
