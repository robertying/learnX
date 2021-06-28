import {FilesAction} from 'data/types/actions';
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS,
  SET_PIN_FILE,
  SET_FAV_FILE,
  SET_UNREAD_FILE,
  SET_ARCHIVE_FILES,
} from 'data/types/constants';
import {FilesState} from 'data/types/state';

export default function files(
  state: FilesState = {
    fetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    archived: [],
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
        unread: action.payload.filter(i => i.isNew).map(i => i.id),
        items: action.payload,
        error: null,
      };
    case GET_ALL_FILES_FOR_COURSES_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload,
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
        unread: [
          ...state.unread.filter(
            id =>
              state.items.find(i => i.id === id)?.courseId !==
              action.payload.courseId,
          ),
          ...action.payload.files.filter(i => i.isNew).map(i => i.id),
        ],
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
        error: action.payload,
      };
    case SET_UNREAD_FILE:
      if (action.payload.flag) {
        return {
          ...state,
          unread: [...state.unread, action.payload.fileId],
        };
      } else {
        return {
          ...state,
          unread: state.unread.filter(item => item !== action.payload.fileId),
        };
      }
    case SET_PIN_FILE:
      if (action.payload.flag) {
        return {
          ...state,
          pinned: [...state.pinned, action.payload.fileId],
        };
      } else {
        return {
          ...state,
          pinned: state.pinned.filter(item => item !== action.payload.fileId),
        };
      }
    case SET_FAV_FILE:
      if (action.payload.flag) {
        return {
          ...state,
          favorites: [...state.favorites, action.payload.fileId],
        };
      } else {
        return {
          ...state,
          favorites: state.favorites.filter(
            item => item !== action.payload.fileId,
          ),
        };
      }
    case SET_ARCHIVE_FILES:
      if (action.payload.flag) {
        return {
          ...state,
          archived: [...state.archived, ...action.payload.fileIds],
        };
      } else {
        return {
          ...state,
          archived: state.archived.filter(
            i => !action.payload.fileIds.includes(i),
          ),
        };
      }
    default:
      return state;
  }
}
