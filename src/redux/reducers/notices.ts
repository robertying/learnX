import {
  IGetNoticesAction,
  IPinNoticeAction,
  IUnpinNoticeAction
} from "../types/actions";
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS,
  GET_NOTICES_FOR_COURSE_FAILURE,
  GET_NOTICES_FOR_COURSE_REQUEST,
  GET_NOTICES_FOR_COURSE_SUCCESS,
  PIN_NOTICE,
  UNPIN_NOTICE
} from "../types/constants";
import { INoticesState } from "../types/state";

export default function notices(
  state: INoticesState = {
    isFetching: false,
    pinned: [],
    items: []
  },
  action: IGetNoticesAction | IPinNoticeAction | IUnpinNoticeAction
): INoticesState {
  switch (action.type) {
    case GET_ALL_NOTICES_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null
      };
    case GET_ALL_NOTICES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload,
        error: null
      };
    case GET_ALL_NOTICES_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload
      };
    case GET_NOTICES_FOR_COURSE_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null
      };
    case GET_NOTICES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: [
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId
          ),
          ...action.payload.notices
        ],
        error: null
      };
    case GET_NOTICES_FOR_COURSE_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload
      };
    case PIN_NOTICE:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload]
      };
    case UNPIN_NOTICE:
      return {
        ...state,
        pinned: state.pinned.filter(item => item !== action.payload)
      };
  }
  return state;
}
