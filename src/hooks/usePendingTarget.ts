import { useContext, useEffect, useEffectEvent } from 'react';
import { create } from 'zustand';
import { SplitViewContext } from 'navigation/SplitView';
import { ListTarget } from 'helpers/openTarget';

/**
 * What waits for its screen to open it: an item, which its list opens, or
 * the week's Schedule, which Today opens (the Electron app's Jump List).
 */
export type PendingTarget = ListTarget | { type: 'schedule'; id: 'week' };
import useDetailNavigator from 'hooks/useDetailNavigator';
import { useWindow } from 'hooks/useWindow';

/**
 * The item a tapped notification, widget row, learnx:// link or Spotlight
 * result points to, until its list screen opens it (`useOpenTarget`), with
 * the window it opens in (iPad, Mac; `hooks/useWindow`).
 */
const usePendingTargetStore = create<{
  /** By window id; the empty string where there's only one window. */
  targets: Partial<Record<string, PendingTarget>>;
}>(() => ({
  targets: {},
}));

export const setPendingTarget = (
  target: PendingTarget | null,
  windowId = '',
) =>
  usePendingTargetStore.setState(({ targets }) => ({
    targets: { ...targets, [windowId]: target ?? undefined },
  }));

/**
 * Lets a list screen open the pending item (`setPendingTarget`) with `open`,
 * its `useShowDetail`, once that knows where the item goes: in the detail pane
 * of its split view once the split is laid out and the pane is ready, or else
 * on the list.
 */
const usePendingTarget = (
  type: PendingTarget['type'],
  open: (id: string) => void,
) => {
  const { windowId } = useWindow();
  const target = usePendingTargetStore(
    state => state.targets[windowId ?? ''] ?? null,
  );
  const { showDetail, laidOut } = useContext(SplitViewContext);
  const detailNavigator = useDetailNavigator();
  // A native split that hasn't been on screen yet may still collapse (on an
  // iPhone, or a folded one), so it hands out a detail pane that won't show.
  const waitingForDetail = !laidOut || (showDetail && !detailNavigator);

  const openTarget = useEffectEvent(open);

  useEffect(() => {
    if (target?.type !== type || !target.id || waitingForDetail) {
      return;
    }
    setPendingTarget(null, windowId);
    openTarget(target.id);
  }, [target, type, waitingForDetail, windowId]);
};

export default usePendingTarget;
