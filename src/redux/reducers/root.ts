import { dummyUsername } from "../../helpers/dummy";
import mockStore from "../mockStore";
import { appReducer } from "../store";
import { IStoreAction } from "../types/actions";
import { CLEAR_STORE, SET_MOCK_STORE } from "../types/constants";
import { IAppState } from "../types/state";
import assignments from "./assignments";
import courses from "./courses";
import currentSemester from "./currentSemester";
import files from "./files";
import notices from "./notices";
import semesters from "./semesters";
import settings from "./settings";
import toast from "./toast";

export const mainReducers = {
  settings,
  assignments,
  courses,
  currentSemester,
  files,
  notices,
  semesters,
  toast
};

export function rootReducer(
  state: IAppState | undefined,
  action: IStoreAction
): IAppState {
  if (action.type === SET_MOCK_STORE) {
    return mockStore;
  } else if (action.type === CLEAR_STORE) {
    // tslint:disable-next-line: no-parameter-reassignment
    state = undefined;
  } else if (state && state.auth.username === dummyUsername) {
    return state;
  }
  return appReducer(state, action);
}
