import { createAction } from "typesafe-actions";
import { SET_AUTO_REFRESHING, SET_TABS_ORDER } from "../types/constants";
import { Tab } from "../types/state";

export const setTabsOrder = createAction(SET_TABS_ORDER, action => {
  return (tabs: ReadonlyArray<Tab>) => action(tabs);
});

export const setAutoRefreshing = createAction(SET_AUTO_REFRESHING, action => {
  return (enabled: boolean) => action(enabled);
});
