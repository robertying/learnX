import { IToastAction } from "../types/actions";
import { HIDE_TOAST, SHOW_TOAST } from "../types/constants";
import { IToastState } from "../types/state";

export default function toast(
  state: IToastState = {
    visible: false,
    text: ""
  },
  action: IToastAction
): IToastState {
  switch (action.type) {
    case SHOW_TOAST:
      return {
        ...state,
        visible: true,
        text: action.payload
      };
    case HIDE_TOAST:
      return {
        ...state,
        visible: false
      };
  }
  return state;
}
