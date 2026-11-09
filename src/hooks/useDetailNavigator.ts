import { useContext, useMemo, useSyncExternalStore } from 'react';
import {
  CommonActions,
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { SplitViewContext } from 'navigation/SplitView';
import type { DetailStackParams } from 'screens/types';

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
 */
export const useShowDetail = (
  /** The list screen's own. */
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
): OpenScreen => {
  const detailNavigator = useDetailNavigator();

  return (name, ...params) => {
    if (detailNavigator) {
      detailNavigator.show(name, ...params);
    } else {
      navigation.dispatch(StackActions.push(name, ...params));
    }
  };
};

export default useDetailNavigator;
