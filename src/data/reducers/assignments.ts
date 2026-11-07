import { AssignmentsAction } from 'data/types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  SET_PENDING_ASSIGNMENT_DATA,
} from 'data/types/constants';
import { AssignmentsState } from 'data/types/state';
import { sortAssignments } from 'helpers/assignments';

export default function assignments(
  state: AssignmentsState = {
    fetching: false,
    items: [],
    pendingAssignmentData: null,
  },
  action: AssignmentsAction,
): AssignmentsState {
  switch (action.type) {
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: action.payload,
        error: null,
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: sortAssignments([
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId,
          ),
          ...action.payload.assignments,
        ]),
        error: null,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case SET_PENDING_ASSIGNMENT_DATA:
      return {
        ...state,
        pendingAssignmentData: action.payload,
      };
    default:
      return state;
  }
}
