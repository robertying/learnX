import {
  IGetFilesAction,
  IPinFileAction,
  IUnpinFileAction,
  IFavFileAction,
  IUnfavFileAction,
} from '../types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  PIN_FILE,
  UNPIN_FILE,
  FAV_FILE,
  UNFAV_FILE,
} from '../types/constants';
import {IFilesState} from '../types/state';

export default function files(
  state: IFilesState = {
    isFetching: false,
    pinned: [],
    favorites: [],
    items: [],
  },
  action:
    | IGetFilesAction
    | IPinFileAction
    | IUnpinFileAction
    | IFavFileAction
    | IUnfavFileAction,
): IFilesState {
  switch (action.type) {
    case GET_ALL_FILES_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_ALL_FILES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload,
        error: null,
      };
    case GET_ALL_FILES_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false,
        error: action.payload,
      };
    case GET_FILES_FOR_COURSE_REQUEST:
      return {
        ...state,
        isFetching: true,
        error: null,
      };
    case GET_FILES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        isFetching: false,
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
        isFetching: false,
        error: action.payload,
      };
    case PIN_FILE:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload],
      };
    case UNPIN_FILE:
      return {
        ...state,
        pinned: state.pinned.filter(item => item !== action.payload),
      };
    case FAV_FILE:
      return {
        ...state,
        favorites: [...(state.favorites || []), action.payload],
      };
    case UNFAV_FILE:
      return {
        ...state,
        favorites: state.favorites.filter(item => item !== action.payload),
      };
  }
  return state;
}
