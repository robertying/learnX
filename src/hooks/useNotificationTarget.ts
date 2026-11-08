import { useContext, useEffect, useEffectEvent } from 'react';
import { create } from 'zustand';
import { SplitViewContext } from 'components/SplitView';
import { NotificationTarget } from 'helpers/notifications';
import useDetailNavigator from 'hooks/useDetailNavigator';

/** The item of a tapped notification, until its list screen opens it. */
const usePendingTargetStore = create<{ target: NotificationTarget | null }>(
  () => ({ target: null }),
);

export const setPendingNotificationTarget = (
  target: NotificationTarget | null,
) => usePendingTargetStore.setState({ target });

/**
 * Lets a list screen open the item of a tapped notification the way a tap on
 * the item would: pushed on a phone, or in the detail pane of its split view,
 * once that pane is ready.
 */
const useNotificationTarget = (
  type: NotificationTarget['type'],
  open: (id: string) => void,
) => {
  const target = usePendingTargetStore(state => state.target);
  const { showDetail } = useContext(SplitViewContext);
  const detailNavigator = useDetailNavigator();
  const waitingForDetail = showDetail && !detailNavigator;

  const openTarget = useEffectEvent(open);

  useEffect(() => {
    if (target?.type !== type || !target.id || waitingForDetail) {
      return;
    }
    setPendingNotificationTarget(null);
    openTarget(target.id);
  }, [target, type, waitingForDetail]);
};

export default useNotificationTarget;
