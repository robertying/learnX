import {
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  CommonActions,
  NavigationContext,
  NavigationRouteContext,
  StackActions,
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
} from '@react-navigation/native';
import { SplitViewContext } from 'navigation/SplitView';
import type {
  DetailNavigationContainerRef,
  DetailStackParams,
} from 'navigation/types';

// Unlike the navigation prop's, this takes a union of screens with the same
// params, such as the settings details, as long as the params fit them all.
type OpenScreen = <Name extends keyof DetailStackParams>(
  name: Name,
  ...params: undefined extends DetailStackParams[Name]
    ? [params?: DetailStackParams[Name]]
    : [params: DetailStackParams[Name]]
) => void;

/** Opens screens in the detail pane of the split view. */
export interface DetailNavigator {
  /** On top of what the pane shows, e.g. an item's attachment. */
  push: OpenScreen;
  /** In place of what the pane shows, without animation, as a list does. */
  show: OpenScreen;
}

// A detail stack's container is only ready some time after it mounts, and a
// ref says nothing when it changes. Its `onReady` reports it here.
const readyListeners = new Set<() => void>();

/** For the `onReady` of a detail stack's navigation container. */
export const reportDetailReady = () =>
  readyListeners.forEach(listener => listener());

const subscribeToReady = (listener: () => void) => {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
};

/** The screen a detail pane starts with, and the item it shows. */
export interface DetailRoot {
  name: keyof DetailStackParams;
  id?: string;
}

// What each detail container shows at the bottom of its stack, as its
// `onStateChange` reports it.
const detailRoots = new Map<DetailNavigationContainerRef, DetailRoot>();
const rootListeners = new Set<() => void>();

/** For the `onStateChange` of a detail stack's navigation container. */
export const reportDetailState = (
  ref: DetailNavigationContainerRef,
  state: NavigationState | undefined,
) => {
  const route = state?.routes[0];
  const previous = detailRoots.get(ref);
  const id = (route?.params as { id?: unknown } | undefined)?.id;
  const root = route
    ? {
        name: route.name as keyof DetailStackParams,
        id: typeof id === 'string' ? id : undefined,
      }
    : undefined;
  if (previous?.name === root?.name && previous?.id === root?.id) {
    return;
  }
  if (root) {
    detailRoots.set(ref, root);
  } else {
    detailRoots.delete(ref);
  }
  rootListeners.forEach(listener => listener());
};

const subscribeToRoots = (listener: () => void) => {
  rootListeners.add(listener);
  return () => {
    rootListeners.delete(listener);
  };
};

/**
 * What the detail pane beside the list shows, where the split view shows one:
 * the screen it starts with (what a list opened), not what was pushed on it.
 */
export const useDetailRoot = (): DetailRoot | undefined => {
  const ref = useContext(SplitViewContext).detailNavigationContainerRef;
  return useSyncExternalStore(subscribeToRoots, () =>
    ref ? detailRoots.get(ref) : undefined,
  );
};

/**
 * The detail pane's stack, when the split view shows one and it is ready, so
 * that screens can open items beside the list rather than on top of it.
 */
const useDetailNavigator = (): DetailNavigator | undefined => {
  const ref = useContext(SplitViewContext).detailNavigationContainerRef;
  const container = useSyncExternalStore(subscribeToReady, () =>
    ref?.current?.isReady() ? ref.current : null,
  );

  return useMemo(
    () =>
      container
        ? {
            push: (name, ...params) =>
              container.dispatch(StackActions.push(name, ...params)),
            // The pane starts over with the item, so that its back button
            // doesn't lead to pages of the item shown before.
            show: (name, ...[params]) =>
              container.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    { name, params: { ...params, disableAnimation: true } },
                  ],
                }),
              ),
          }
        : undefined,
    [container],
  );
};

/**
 * Opens an item from a list: in the detail pane beside the list where the
 * split view shows one, and on top of the list otherwise.
 *
 * What was pushed on the list without a pane (on a folded phone, or in a
 * narrow window) moves into the pane once there is one, so that the item
 * isn't left covering the list.
 */
export const useShowDetail = (
  /** The list screen's own. */
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
): OpenScreen => {
  const detailNavigator = useDetailNavigator();
  const container =
    useContext(SplitViewContext).detailNavigationContainerRef?.current;
  // Optional, for lists rendered outside a navigator (as in tests).
  const listNavigation = useContext(NavigationContext);
  const routeKey = useContext(NavigationRouteContext)?.key;

  const moveToDetail = useEffectEvent(() => {
    const detailState = container?.getRootState();
    const stack = listNavigation?.getState();
    if (!detailState || !stack) {
      return;
    }
    const index = stack.routes.findIndex(route => route.key === routeKey);
    const above = stack.routes.slice(index + 1);
    // Not for a screen in the pane itself, nor for a list pushed on another
    // (Settings on Today), which isn't a page of the pane.
    if (
      stack.key === detailState.key ||
      index === -1 ||
      above.length === 0 ||
      above.some(
        route =>
          !detailState.routeNames.includes(
            route.name as keyof DetailStackParams,
          ),
      )
    ) {
      return;
    }
    container!.dispatch(
      CommonActions.reset({
        index: above.length - 1,
        routes: above.map(({ name, params }, i) => ({
          name,
          params: i === 0 ? { ...params, disableAnimation: true } : params,
        })),
      }),
    );
    navigation.dispatch(StackActions.pop(above.length));
  });
  useEffect(() => {
    if (detailNavigator) {
      moveToDetail();
    }
  }, [detailNavigator]);

  return (name, ...params) => {
    if (detailNavigator) {
      detailNavigator.show(name, ...params);
    } else {
      navigation.dispatch(StackActions.push(name, ...params));
    }
  };
};

export default useDetailNavigator;
