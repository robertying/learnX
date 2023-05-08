import {SemestersAction} from 'data/types/actions';
import {
  GET_ALL_SEMESTERS_FAILURE,
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS,
  GET_CURRENT_SEMESTER_FAILURE,
  GET_CURRENT_SEMESTER_REQUEST,
  GET_CURRENT_SEMESTER_SUCCESS,
  SET_CURRENT_SEMESTER,
} from 'data/types/constants';
import {SemestersState} from 'data/types/state';

export default function semesters(
  state: SemestersState = {
    fetching: false,
    items: [],
    current: null,
  },
  action: SemestersAction,
): SemestersState {
  switch (action.type) {
    case GET_ALL_SEMESTERS_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_ALL_SEMESTERS_SUCCESS:
      return {
        ...state,
        fetching: false,
        items: action.payload,
        error: null,
      };
    case GET_ALL_SEMESTERS_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload,
      };
    case GET_CURRENT_SEMESTER_REQUEST:
      return {
        ...state,
        fetching: true,
        error: null,
      };
    case GET_CURRENT_SEMESTER_SUCCESS:
      return {
        ...state,
        fetching: false,
        error: null,
      };
    case GET_CURRENT_SEMESTER_FAILURE:
      return {
        ...state,
        fetching: false,
        error: action.payload,
      };
    case SET_CURRENT_SEMESTER:
      return {
        ...state,
        current: action.payload,
      };
    default:
      return state;
  }
}
