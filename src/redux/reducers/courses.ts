import {
  IGetCoursesForSemesterAction,
  IHideCourseAction,
  IUnhideCourseAction,
} from '../types/actions';
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  HIDE_COURSE,
  UNHIDE_COURSE,
} from '../types/constants';
import {ICoursesState} from '../types/state';

export default function courses(
  state: ICoursesState = {
    isFetching: false,
    hidden: [],
    items: [],
  },
  action:
    | IGetCoursesForSemesterAction
    | IHideCourseAction
    | IUnhideCourseAction,
): ICoursesState {
  switch (action.type) {
    case GET_COURSES_FOR_SEMESTER_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_COURSES_FOR_SEMESTER_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload,
        error: null,
      };
    case GET_COURSES_FOR_SEMESTER_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case HIDE_COURSE:
      return {
        ...state,
        hidden: [...(state.hidden || []), action.payload],
      };
    case UNHIDE_COURSE:
      return {
        ...state,
        hidden: state.hidden.filter(item => item !== action.payload),
      };
  }
  return state;
}
