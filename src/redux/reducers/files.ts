import { IGetFilesAction } from "../types/actions";
import {
  GET_ALL_FILES_FOR_COURSES_FAILURE,
  GET_ALL_FILES_FOR_COURSES_REQUEST,
  GET_ALL_FILES_FOR_COURSES_SUCCESS,
  GET_FILES_FOR_COURSE_FAILURE,
  GET_FILES_FOR_COURSE_REQUEST,
  GET_FILES_FOR_COURSE_SUCCESS
} from "../types/constants";
import { IFilesState } from "../types/state";

export default function files(
  state: IFilesState = {
    isFetching: false,
    items: []
  },
  action: IGetFilesAction
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
    case GET_FILES_FOR_COURSE_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_FILES_FOR_COURSE_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: [
          ...state.items.filter(
            item => item.courseId !== action.payload.courseId
          ),
          ...action.payload.files
        ]
      };
    case GET_FILES_FOR_COURSE_FAILURE:
      return {
        ...state,
        isFetching: false
      };
  }
  return state;
}
