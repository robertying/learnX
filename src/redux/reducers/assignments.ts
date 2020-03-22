import differenceBy from 'lodash.differenceby';
import {
  IGetAssignmentsAction,
  IPinAssignmentAction,
  IUnpinAssignmentAction,
  IFavAssignmentAction,
  IUnfavAssignmentAction,
  IReadAssignmentAction,
  IUnreadAssignmentAction,
} from '../types/actions';
import {
  GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST,
  GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS,
  GET_ASSIGNMENTS_FOR_COURSE_FAILURE,
  GET_ASSIGNMENTS_FOR_COURSE_REQUEST,
  GET_ASSIGNMENTS_FOR_COURSE_SUCCESS,
  PIN_ASSIGNMENT,
  UNPIN_ASSIGNMENT,
  FAV_ASSIGNMENT,
  UNFAV_ASSIGNMENT,
  UNREAD_ASSIGNMENT,
  READ_ASSIGNMENT,
} from '../types/constants';
import {IAssignmentsState} from '../types/state';

export default function assignments(
  state: IAssignmentsState = {
    isFetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    items: [],
  },
  action:
    | IGetAssignmentsAction
    | IReadAssignmentAction
    | IUnreadAssignmentAction
    | IPinAssignmentAction
    | IUnpinAssignmentAction
    | IFavAssignmentAction
    | IUnfavAssignmentAction,
): IAssignmentsState {
  switch (action.type) {
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        unread:
          state.items.length === 0
            ? []
            : [
                ...state.unread,
                ...differenceBy(action.payload, state.items, 'id').map(
                  (i) => i.id,
                ),
              ],
        items: action.payload,
        error: null,
      };
    case GET_ALL_ASSIGNMENTS_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_SUCCESS:
      return {
        ...state,
        isFetching: false,
        unread:
          state.items.length === 0
            ? []
            : [
                ...state.unread,
                ...differenceBy(
                  action.payload.assignments,
                  state.items.filter(
                    (item) => item.courseId === action.payload.courseId,
                  ),
                  'id',
                ).map((i) => i.id),
              ],
        items: [
          ...state.items.filter(
            (item) => item.courseId !== action.payload.courseId,
          ),
          ...action.payload.assignments,
        ],
        error: null,
      };
    case GET_ASSIGNMENTS_FOR_COURSE_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case UNREAD_ASSIGNMENT:
      return {
        ...state,
        unread: [...(state.unread || []), action.payload],
      };
    case READ_ASSIGNMENT:
      return {
        ...state,
        unread: state.unread.filter((item) => item !== action.payload),
      };
    case PIN_ASSIGNMENT:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload],
      };
    case UNPIN_ASSIGNMENT:
      return {
        ...state,
        pinned: state.pinned.filter((item) => item !== action.payload),
      };
    case FAV_ASSIGNMENT:
      return {
        ...state,
        favorites: [...(state.favorites || []), action.payload],
      };
    case UNFAV_ASSIGNMENT:
      return {
        ...state,
        favorites: state.favorites.filter((item) => item !== action.payload),
      };
  }
  return state;
}
