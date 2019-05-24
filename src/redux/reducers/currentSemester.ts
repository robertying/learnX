import {
  IGetCurrentSemesterAction,
  ISetCurrentSemesterAction
} from "../types/actions";
import { GET_CURRENT_SEMESTER, SET_CURRENT_SEMESTER } from "../types/constants";
import { ISemester } from "../types/state";

export default function currentSemester(
  state: ISemester = "2018-2019-2",
  action: IGetCurrentSemesterAction | ISetCurrentSemesterAction
): ISemester {
  switch (action.type) {
    case GET_CURRENT_SEMESTER:
      if (action.payload && action.payload.length !== 0) {
        return state || action.payload[0];
      } else {
        return state;
      }
    case SET_CURRENT_SEMESTER:
      return action.payload;
  }
  return state;
}
