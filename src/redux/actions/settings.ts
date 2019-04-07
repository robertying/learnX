import { createAction } from "typesafe-actions";
import { SET_TABS_ORDER } from "../types/constants";
import { Tab } from "../types/state";

export const setTabsOrder = createAction(SET_TABS_ORDER, action => {
  return (tabs: ReadonlyArray<Tab>) => action(tabs);
});
