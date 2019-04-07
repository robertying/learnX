import { IGetCoursesForSemesterAction } from "../types/actions";
import {
  GET_COURSES_FOR_SEMESTER_FAILURE,
  GET_COURSES_FOR_SEMESTER_REQUEST,
  GET_COURSES_FOR_SEMESTER_SUCCESS
} from "../types/constants";
import { ICoursesState } from "../types/state";

export default function courses(
  state: ICoursesState = {
    isFetching: false,
    items: []
  },
  action: IGetCoursesForSemesterAction
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
  }
  return state;
}
