import { useContext, useEffect, useEffectEvent } from 'react';
import { create } from 'zustand';
import { SplitViewContext } from 'navigation/SplitView';
import { ListTarget } from 'helpers/openTarget';
import useDetailNavigator from 'hooks/useDetailNavigator';

/**
 * The item a tapped notification, widget row, learnx:// link or Spotlight
 * result points to, until its list screen opens it (`useOpenTarget`).
 */
const usePendingTargetStore = create<{ target: ListTarget | null }>(() => ({
  target: null,
}));

export const setPendingTarget = (target: ListTarget | null) =>
  usePendingTargetStore.setState({ target });

/**
 * Lets a list screen open the pending item (`setPendingTarget`): in the detail
 * pane of its split view once the split is laid out and the pane is ready
 * (`inDetail`), or else pushed on the list.
 */
const usePendingTarget = (
  type: ListTarget['type'],
  open: (id: string, inDetail: boolean) => void,
) => {
  const target = usePendingTargetStore(state => state.target);
  const { showDetail, laidOut } = useContext(SplitViewContext);
  const detailNavigator = useDetailNavigator();
  // A native split that hasn't been on screen yet may still collapse (on an
  // iPhone, or a folded one), so it hands out a detail pane that won't show.
  const waitingForDetail = !laidOut || (showDetail && !detailNavigator);
  const inDetail = !!detailNavigator;

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
