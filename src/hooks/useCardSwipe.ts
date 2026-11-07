import { useEffect, useRef } from 'react';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { pressWhileSwiped } from 'helpers/cardActions';

/**
 * A card's swipe state: the swipeable's ref and open/close handlers,
 * `openActions` for a long press, and `interceptPress`, which swallows the
 * press iOS emits at the end of the swipe and closes the actions on a later
 * tap. The actions close when selection or reorder mode turns on.
 */
const useCardSwipe = ({
  selectionMode,
  reorderMode,
}: {
  selectionMode?: boolean;
  reorderMode?: boolean;
}) => {
  const snapRef = useRef<SwipeableMethods>(null);
  const openRef = useRef(false);
  const openedAtRef = useRef(0);

  const close = () => {
    snapRef.current?.close();
  };

  const openActions = () => {
    snapRef.current?.openRight();
  };

  const onWillOpen = () => {
    openRef.current = true;
    openedAtRef.current = Date.now();
  };

  const onWillClose = () => {
    openRef.current = false;
  };

  /** True when the press was handled here and should go no further */
  const interceptPress = () => {
    const result = pressWhileSwiped(
      openRef.current,
      openedAtRef.current,
      Date.now(),
    );
    if (result === 'close') {
      close();
    }
    return result !== 'press';
  };

  useEffect(() => {
    if (selectionMode) {
      snapRef.current?.close();
    }
  }, [selectionMode]);

  useEffect(() => {
    if (reorderMode) {
      snapRef.current?.close();
    }
  }, [reorderMode]);

  return { snapRef, openActions, onWillOpen, onWillClose, interceptPress };
};

export default useCardSwipe;
