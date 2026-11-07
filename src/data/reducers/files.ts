import { FilesAction } from 'data/types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
} from 'data/types/constants';
import { FilesState } from 'data/types/state';

export default function files(
  state: FilesState = {
    fetching: false,
    items: [],
  },
  action: FilesAction,
): FilesState {
  switch (action.type) {
    case GET_ALL_FILES_FOR_COURSES_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_ALL_FILES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: action.payload,
        error: null,
      };
    case GET_ALL_FILES_FOR_COURSES_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    case GET_FILES_FOR_COURSE_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_FILES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: [
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId,
          ),
          ...action.payload.files,
        ],
        error: null,
      };
    case GET_FILES_FOR_COURSE_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload.reason,
      };
    default:
      return state;
  }
}
