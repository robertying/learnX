import {NoticesAction} from 'data/types/actions';
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  SET_FAV_NOTICE,
  SET_ARCHIVE_NOTICES,
} from 'data/types/constants';
import {NoticeState} from 'data/types/state';

export default function notices(
  state: NoticeState = {
    fetching: false,
    favorites: [],
    archived: [],
    items: [],
  },
  action: NoticesAction,
): NoticeState {
  switch (action.type) {
    case GET_ALL_NOTICES_FOR_COURSES_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_ALL_NOTICES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: action.payload,
        error: null,
      };
    case GET_ALL_NOTICES_FOR_COURSES_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case GET_NOTICES_FOR_COURSE_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_NOTICES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        fetching: false,
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
        fetching: false,
        error: action.payload.reason,
      };
    case SET_FAV_NOTICE:
      if (action.payload.flag) {
        return {
          ...state,
          favorites: [...state.favorites, action.payload.noticeId],
        };
      } else {
        return {
          ...state,
          favorites: state.favorites.filter(
            item => item !== action.payload.noticeId,
          ),
        };
      }
    case SET_ARCHIVE_NOTICES:
      if (action.payload.flag) {
        return {
          ...state,
          archived: [...state.archived, ...action.payload.noticeIds],
        };
      } else {
        return {
          ...state,
          archived: state.archived.filter(
            i => !action.payload.noticeIds.includes(i),
          ),
        };
      }
    default:
      return state;
  }
}
