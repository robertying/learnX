import { UserAction } from 'data/types/actions';
import { GET_USER_INFO_SUCCESS } from 'data/types/constants';
import { UserState } from 'data/types/state';

export default function user(
  state: UserState = {
    name: null,
    department: null,
  },
  action: UserAction,
): UserState {
  switch (action.type) {
    case GET_USER_INFO_SUCCESS:
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
}
