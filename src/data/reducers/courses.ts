import { CoursesAction } from 'data/types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
} from 'data/types/constants';
import { CoursesState } from 'data/types/state';

export default function courses(
  state: CoursesState = {
    fetching: false,
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
    case GET_COURSES_FOR_SEMESTER_SUCCESS: {
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
    }
    case GET_COURSES_FOR_SEMESTER_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    default:
      return state;
  }
}
