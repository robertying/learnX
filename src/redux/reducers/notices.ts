import differenceBy from 'lodash.differenceby';
import {
  IGetNoticesAction,
  IPinNoticeAction,
  IUnpinNoticeAction,
  IFavNoticeAction,
  IUnfavNoticeAction,
  IReadNoticeAction,
  IUnreadNoticeAction,
} from '../types/actions';
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  PIN_NOTICE,
  UNPIN_NOTICE,
  FAV_NOTICE,
  UNFAV_NOTICE,
  UNREAD_NOTICE,
  READ_NOTICE,
} from '../types/constants';
import {INoticesState} from '../types/state';

export default function notices(
  state: INoticesState = {
    isFetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    items: [],
  },
  action:
    | IGetNoticesAction
    | IReadNoticeAction
    | IUnreadNoticeAction
    | IPinNoticeAction
    | IUnpinNoticeAction
    | IFavNoticeAction
    | IUnfavNoticeAction,
): INoticesState {
  switch (action.type) {
    case GET_ALL_NOTICES_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_ALL_NOTICES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        unread:
          state.items.length === 0
            ? []
            : [
                ...state.unread,
                ...differenceBy(action.payload, state.items, 'id').map(
                  i => i.id,
                ),
              ],
        items: action.payload,
        error: null,
      };
    case GET_ALL_NOTICES_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case GET_NOTICES_FOR_COURSE_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_NOTICES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        isFetching: false,
        unread:
          state.items.length === 0
            ? []
            : [
                ...state.unread,
                ...differenceBy(
                  action.payload.notices,
                  state.items.filter(
                    item => item.courseId === action.payload.courseId,
                  ),
                  'id',
                ).map(i => i.id),
              ],
        items: [
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId,
          ),
          ...action.payload.notices,
        ],
        error: null,
      };
    case GET_NOTICES_FOR_COURSE_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case UNREAD_NOTICE:
      return {
        ...state,
        unread: [...(state.unread || []), action.payload],
      };
    case READ_NOTICE:
      return {
        ...state,
        unread: state.unread.filter(item => item !== action.payload),
      };
    case PIN_NOTICE:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload],
      };
    case UNPIN_NOTICE:
      return {
        ...state,
        pinned: state.pinned.filter(item => item !== action.payload),
      };
    case FAV_NOTICE:
      return {
        ...state,
        favorites: [...(state.favorites || []), action.payload],
      };
    case UNFAV_NOTICE:
      return {
        ...state,
        favorites: state.favorites.filter(item => item !== action.payload),
      };
  }
  return state;
}
