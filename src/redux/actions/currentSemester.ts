import { createAction } from "typesafe-actions";
import { GET_CURRENT_SEMESTER } from "../types/constants";
import { ISemester } from "../types/state";

export const getCurrentSemester = createAction(GET_CURRENT_SEMESTER, action => {
  return (semesters: ReadonlyArray<ISemester>) => action(semesters);
});
