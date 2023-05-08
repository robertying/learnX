import {AssignmentsAction} from 'data/types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  SET_PIN_ASSIGNMENT,
  SET_FAV_ASSIGNMENT,
  SET_UNREAD_ASSIGNMENT,
  SET_ARCHIVE_ASSIGNMENTS,
} from 'data/types/constants';
import {AssignmentsState} from 'data/types/state';

export default function assignments(
  state: AssignmentsState = {
    fetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    archived: [],
    items: [],
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
        items: [
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId,
          ),
          ...action.payload.assignments,
        ],
        error: null,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case SET_UNREAD_ASSIGNMENT:
      if (action.payload.flag) {
        return {
          ...state,
          unread: [...state.unread, action.payload.assignmentId],
        };
      } else {
        return {
          ...state,
          unread: state.unread.filter(
            item => item !== action.payload.assignmentId,
          ),
        };
      }
    case SET_PIN_ASSIGNMENT:
      if (action.payload.flag) {
        return {
          ...state,
          pinned: [...state.pinned, action.payload.assignmentId],
        };
      } else {
        return {
          ...state,
          pinned: state.pinned.filter(
            item => item !== action.payload.assignmentId,
          ),
        };
      }
    case SET_FAV_ASSIGNMENT:
      if (action.payload.flag) {
        return {
          ...state,
          favorites: [...state.favorites, action.payload.assignmentId],
        };
      } else {
        return {
          ...state,
          favorites: state.favorites.filter(
            item => item !== action.payload.assignmentId,
          ),
        };
      }
    case SET_ARCHIVE_ASSIGNMENTS:
      if (action.payload.flag) {
        return {
          ...state,
          archived: [...state.archived, ...action.payload.assignmentIds],
        };
      } else {
        return {
          ...state,
          archived: state.archived.filter(
            i => !action.payload.assignmentIds.includes(i),
          ),
        };
      }
    default:
      return state;
  }
}
