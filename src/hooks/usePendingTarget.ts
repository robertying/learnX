import { useContext, useEffect, useEffectEvent } from 'react';
import { create } from 'zustand';
import { SplitViewContext } from 'components/SplitView';
import { useSplitLaidOut } from 'components/NativeSplitView';
import { nativeSplit } from 'navigation/layout';
import DeviceInfo from 'constants/DeviceInfo';
import { ItemTarget } from 'helpers/openTarget';
import useDetailNavigator from 'hooks/useDetailNavigator';

/**
 * The item a tapped notification, widget row, learnx:// link or Spotlight
 * result points to, until its list screen opens it (`useOpenTarget`).
 */
const usePendingTargetStore = create<{ target: ItemTarget | null }>(() => ({
  target: null,
}));

export const setPendingTarget = (target: ItemTarget | null) =>
  usePendingTargetStore.setState({ target });

/**
 * An iPhone's tabs are native splits that stay collapsed, but until UIKit
 * collapses one (when its tab first shows), it hands out its hidden detail
 * pane. Items are pushed on the list there instead.
 */
const phoneSplit = () =>
  nativeSplit && !DeviceInfo.isTablet() && !DeviceInfo.isMac();

/**
 * Lets a list screen open the pending item (`setPendingTarget`): in the detail
 * pane of its split view once the split is laid out and the pane is ready
 * (`inDetail`), or else pushed on the list.
 */
const usePendingTarget = (
  type: ItemTarget['type'],
  open: (id: string, inDetail: boolean) => void,
) => {
  const target = usePendingTargetStore(state => state.target);
  const { showDetail } = useContext(SplitViewContext);
  const detailNavigator = useDetailNavigator();
  const splitLaidOut = useSplitLaidOut();
  const onPhone = phoneSplit();
  const waitingForDetail =
    !onPhone &&
    ((nativeSplit && !splitLaidOut) || (showDetail && !detailNavigator));
  const inDetail = !onPhone && !!detailNavigator;

  const openTarget = useEffectEvent(open);

  useEffect(() => {
    if (target?.type !== type || !target.id || waitingForDetail) {
      return;
    }
    setPendingTarget(null);
    openTarget(target.id, inDetail);
  }, [target, type, waitingForDetail, inDetail]);
};

export default usePendingTarget;
