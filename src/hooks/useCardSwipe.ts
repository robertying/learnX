import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeSide } from 'components/CardSwipeAction';
import { pressWhileSwiped } from 'helpers/cardActions';
import { playHaptic } from 'services/haptics';

/** Closes the card whose actions are open, so only one is open at a time, as in Mail */
let closeOpenCard: (() => void) | null = null;

const sideOf = (direction: SwipeDirection): SwipeSide =>
  direction === SwipeDirection.RIGHT ? 'leading' : 'trailing';

/**
 * A card's swipe state: the swipeable's ref and its event handlers, and
 * `interceptPress`, which swallows the press iOS emits at the end of the
 * swipe and closes the actions on a later tap. `onSwipe` runs a side's action
 * when a swipe commits to it: on iOS when let go past the full-swipe point
 * (short of it the card rests open on the button), on Android whenever the
 * card slides all the way open. The actions close when selection or reorder
 * mode turns on.
 */
const useCardSwipe = ({
  selectionMode,
  reorderMode,
  onSwipe,
}: {
  selectionMode?: boolean;
  reorderMode?: boolean;
  onSwipe: (side: SwipeSide) => void;
}) => {
  const snapRef = useRef<SwipeableMethods>(null);
  const openRef = useRef(false);
  const openedAtRef = useRef(0);
  const armedRef = useRef<Record<SwipeSide, boolean>>({
    leading: false,
    trailing: false,
  });

  const close = () => {
    snapRef.current?.close();
  };
  // Stable, so the open card can be told apart from the others
  const closeSelfRef = useRef(() => snapRef.current?.close());

  /** Another card starts swiping: close this one's if open */
  const closeOthers = () => {
    if (closeOpenCard && closeOpenCard !== closeSelfRef.current) {
      closeOpenCard();
    }
    closeOpenCard = closeSelfRef.current;
  };

  const commit = (side: SwipeSide) => {
    armedRef.current[side] = false;
    onSwipe(side);
    close();
  };

  /**
   * The swipe crossed the full-swipe point: a tap each way, as in Mail and
   * Gmail. Going back under it after the action ran (the card closing) is
   * silent: `commit` already disarmed the side.
   */
  const onArmedChange = (side: SwipeSide, armed: boolean) => {
    const wasArmed = armedRef.current[side];
    armedRef.current[side] = armed;
    if (armed) {
      playHaptic('threshold');
    } else if (wasArmed) {
      playHaptic('thresholdRelease');
    }
  };

  const onWillOpen = (direction: SwipeDirection) => {
    closeOthers();
    openRef.current = true;
    openedAtRef.current = Date.now();
    const side = sideOf(direction);
    if (Platform.OS === 'ios' && armedRef.current[side]) {
      commit(side);
    }
  };

  const onOpen = (direction: SwipeDirection) => {
    if (Platform.OS === 'android') {
      commit(sideOf(direction));
    }
  };

  const onWillClose = () => {
    openRef.current = false;
    if (closeOpenCard === closeSelfRef.current) {
      closeOpenCard = null;
    }
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

  return {
    snapRef,
    close,
    onArmedChange,
    onStartDrag: closeOthers,
    onWillOpen,
    onOpen,
    onWillClose,
    interceptPress,
  };
};

export default useCardSwipe;
