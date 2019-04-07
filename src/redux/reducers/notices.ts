import { IGetAllNoticesForCoursesAction } from "../types/actions";
import {
  GET_ALL_NOTICES_FOR_COURSES_FAILURE,
  GET_ALL_NOTICES_FOR_COURSES_REQUEST,
  GET_ALL_NOTICES_FOR_COURSES_SUCCESS
} from "../types/constants";
import { INoticesState } from "../types/state";

export default function notices(
  state: INoticesState = {
    isFetching: false,
    items: []
  },
  action: IGetAllNoticesForCoursesAction
): INoticesState {
  switch (action.type) {
    case GET_ALL_NOTICES_FOR_COURSES_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_ALL_NOTICES_FOR_COURSES_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload
      };
    case GET_ALL_NOTICES_FOR_COURSES_FAILURE:
      return {
        ...state,
        isFetching: false
      };
  }
  return state;
}
