import { IGetAllSemestersAction } from "../types/actions";
import {
  GET_ALL_SEMESTERS_FAILURE,
  GET_ALL_SEMESTERS_REQUEST,
  GET_ALL_SEMESTERS_SUCCESS
} from "../types/constants";
import { ISemestersState } from "../types/state";

export default function semesters(
  state: ISemestersState = {
    isFetching: false,
    items: []
  },
  action: IGetAllSemestersAction
): ISemestersState {
  switch (action.type) {
    case GET_ALL_SEMESTERS_REQUEST:
      return {
        ...state,
        isFetching: true
      };
    case GET_ALL_SEMESTERS_SUCCESS:
      return {
        ...state,
        isFetching: false,
        items: action.payload
      };
    case GET_ALL_SEMESTERS_FAILURE:
      return {
        ...state,
        isFetching: false
      };
  }
  return state;
}
