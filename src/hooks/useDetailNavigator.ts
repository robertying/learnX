import { useContext, useMemo } from 'react';
import { StackActions } from '@react-navigation/native';
import { SplitViewContext } from 'components/SplitView';
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
  push: OpenScreen;
  replace: OpenScreen;
}

/**
 * The detail pane's stack, when the split view shows one and it is ready, so
 * that screens can open items beside the list rather than on top of it.
 */
const useDetailNavigator = (): DetailNavigator | undefined => {
  const context = useContext(SplitViewContext);
  const container = context.detailNavigationContainerRef?.current;

  return useMemo(
    () =>
      container
        ? {
            push: (name, ...params) =>
              container.dispatch(StackActions.push(name, ...params)),
            replace: (name, ...params) =>
              container.dispatch(StackActions.replace(name, ...params)),
          }
        : undefined,
    [container],
  );
};

export default useDetailNavigator;
