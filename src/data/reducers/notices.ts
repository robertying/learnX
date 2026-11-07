import { NoticesAction } from 'data/types/actions';
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
} from 'data/types/constants';
import { NoticeState } from 'data/types/state';

export default function notices(
  state: NoticeState = {
    fetching: false,
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
    default:
      return state;
  }
}
