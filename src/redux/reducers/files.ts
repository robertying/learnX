import { IGetAllFilesForCoursesAction } from "../types/actions";
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS
} from "../types/constants";
import { IFilesState } from "../types/state";

export default function files(
  state: IFilesState = {
    isFetching: false,
    items: []
  },
  action: IGetAllFilesForCoursesAction
): IFilesState {
  switch (action.type) {
    case GET_ALL_FILES_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_ALL_FILES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload
      };
    case GET_ALL_FILES_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false
      };
  }
  return state;
}
