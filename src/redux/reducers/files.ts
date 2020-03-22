import differenceBy from 'lodash.differenceby';
import {
  IGetFilesAction,
  IPinFileAction,
  IUnpinFileAction,
  IFavFileAction,
  IUnfavFileAction,
  IUnreadFileAction,
  IReadFileAction,
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
  UNREAD_FILE,
  READ_FILE,
} from '../types/constants';
import {IFilesState} from '../types/state';

export default function files(
  state: IFilesState = {
    isFetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    items: [],
  },
  action:
    | IGetFilesAction
    | IReadFileAction
    | IUnreadFileAction
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
        unread:
          state.items.length === 0
            ? []
            : [
                ...state.unread,
                ...differenceBy(
                  action.payload.files,
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
    case UNREAD_FILE:
      return {
        ...state,
        unread: [...(state.unread || []), action.payload],
      };
    case READ_FILE:
      return {
        ...state,
        unread: state.unread.filter((item) => item !== action.payload),
      };
    case PIN_FILE:
      return {
        ...state,
        pinned: [...(state.pinned || []), action.payload],
      };
    case UNPIN_FILE:
      return {
        ...state,
        pinned: state.pinned.filter((item) => item !== action.payload),
      };
    case FAV_FILE:
      return {
        ...state,
        favorites: [...(state.favorites || []), action.payload],
      };
    case UNFAV_FILE:
      return {
        ...state,
        favorites: state.favorites.filter((item) => item !== action.payload),
      };
  }
  return state;
}
