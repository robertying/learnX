import {CoursesAction} from 'data/types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  SET_HIDE_COURSE,
} from 'data/types/constants';
import {CoursesState} from 'data/types/state';

export default function courses(
  state: CoursesState = {
    fetching: false,
    hidden: [],
    items: [],
    names: {},
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
    case GET_COURSES_FOR_SEMESTER_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: action.payload,
        names: action.payload.reduce(
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
    default:
      return state;
  }
}
