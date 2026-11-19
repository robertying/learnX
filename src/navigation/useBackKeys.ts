import {
  StackActions,
  type NavigationContainerRef,
  type NavigationState,
  type ParamListBase,
  type PartialState,
} from '@react-navigation/native';
import useAppCommand from 'hooks/useAppCommand';

type Container = Pick<
  NavigationContainerRef<ParamListBase>,
  'isReady' | 'getCurrentOptions' | 'getRootState' | 'dispatch'
>;
type ContainerRef = { current: Container | null };

type State = NavigationState | PartialState<NavigationState>;

const ready = (ref: ContainerRef | null) =>
  ref?.current?.isReady() ? ref.current : null;

/**
 * The stack whose top page the header's back arrow leaves: the innermost of
 * the shown stacks that has a page to go back to. Not the tabs, which the
 * back arrow doesn't switch either.
 */
const stackToPop = (state: State | undefined): State | undefined => {
  if (!state) {
    return undefined;
  }
  // The shown navigators are mounted, so their states are whole ones.
  const { index } = state as NavigationState;
  const inner = stackToPop(state.routes[index]?.state);
  return inner ?? (state.type === 'stack' && index > 0 ? state : undefined);
};

/**
 * Pops `state`'s top page in `container`: not where a swipe may not take it
 * away either (a submission while it uploads).
 */
const pop = (container: Container, state: State | undefined) => {
  if (
    !state?.key ||
    (container.getCurrentOptions() as { gestureEnabled?: boolean } | undefined)
      ?.gestureEnabled === false
  ) {
    return false;
  }
  container.dispatch({ ...StackActions.pop(), target: state.key });
  return true;
};

/** The sheet over the window (Search, a submission): the root's routes. */
const sheets = (window: Container) => {
  const state = window.getRootState();
  return state?.index ? state : undefined;
};

/**
 * The Electron app's back and close keys, as Windows apps take them:
 * - Alt+← and the mouse's back button go a page back in the sheet over the
 *   window (closing it from its first page), otherwise in the detail pane
 *   (`detail`), otherwise in the list, as Android's back button does.
 * - Esc closes the sheet over the window, whatever page of it shows.
 * `root` is the window's main navigation container. Other platforms don't
 * send these commands.
 */
const useBackKeys = (
  root: ContainerRef | null,
  detail: ContainerRef | null,
  enabled = true,
) => {
  useAppCommand(
    'back',
    () => {
      const window = ready(root);
      if (!window) {
        return;
      }
      const container = sheets(window) ? null : ready(detail);
      if (
        !(container && pop(container, stackToPop(container.getRootState())))
      ) {
        pop(window, stackToPop(window.getRootState()));
      }
    },
    enabled,
  );
  useAppCommand(
    'close',
    () => {
      const window = ready(root);
      if (window) {
        pop(window, sheets(window));
      }
    },
    enabled,
  );
};

export default useBackKeys;
