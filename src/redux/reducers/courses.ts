import {
  IGetCoursesForSemesterAction,
  IPinCourseAction,
  ISetCoursesFilter,
  IUnpinCourseAction
} from "../types/actions";
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS,
  PIN_COURSE,
  UNPIN_COURSE
} from "../types/constants";
import { ICoursesState } from "../types/state";

export default function courses(
  state: ICoursesState = {
    isFetching: false,
    pinned: [],
    items: []
  },
  action:
    | IGetCoursesForSemesterAction
    | IPinCourseAction
    | IUnpinCourseAction
): ICoursesState {
  switch (action.type) {
    case GET_COURSES_FOR_SEMESTER_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_COURSES_FOR_SEMESTER_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload
      };
    case GET_COURSES_FOR_SEMESTER_FAILURE:
      return {
        ...state,
        isFetching: false
      };
    case PIN_COURSE:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload]
      };
    case UNPIN_COURSE:
      return {
        ...state,
        pinned: state.pinned.filter(item => item !== action.payload)
      };
  }
  return state;
}
