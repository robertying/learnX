import { IGetAllAssignmentsForCoursesAction } from "../types/actions";
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS
} from "../types/constants";
import { IAssignmentsState } from "../types/state";

export default function assignments(
  state: IAssignmentsState = {
    isFetching: false,
    items: []
  },
  action: IGetAllAssignmentsForCoursesAction
): IAssignmentsState {
  switch (action.type) {
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false
      };
  }
  return state;
}
