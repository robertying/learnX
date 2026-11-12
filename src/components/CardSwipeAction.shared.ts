import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { CardAction } from 'helpers/cardActions';

/** The edge a swipe action shows from: leading for a right swipe */
export type SwipeSide = 'leading' | 'trailing';

/**
 * How far across the card, as a share of its width, a swipe has to go to run
 * its action when let go, rather than spring back (or, on iOS, rest open on
 * the button).
 */
export const FULL_SWIPE = 0.5;

export interface CardSwipeActionProps {
  side: SwipeSide;
  action: CardAction;
  /** The card's offset: positive while it is swiped right */
  translation: SharedValue<number>;
  rowWidth: SharedValue<number>;
  /** Called as the swipe goes past `FULL_SWIPE` and back. */
  onArmedChange: (armed: boolean) => void;
  /** A tap on the revealed button (iOS) */
  onPress: () => void;
}

/** The share of the card's width the swipe has covered toward `side` */
export const swipedShare = (
  side: SwipeSide,
  translation: number,
  rowWidth: number,
) => {
  'worklet';
  if (rowWidth <= 0) {
    return 0;
  }
  return ((side === 'leading' ? 1 : -1) * translation) / rowWidth;
};

/**
 * Goes from 0 to 1 as the swipe passes `FULL_SWIPE`, and back as it returns,
 * calling `onArmedChange` at each crossing.
 */
export const useArmedProgress = ({
  side,
  translation,
  rowWidth,
  onArmedChange,
}: Pick<
  CardSwipeActionProps,
  'side' | 'translation' | 'rowWidth' | 'onArmedChange'
>) => {
  const armedProgress = useSharedValue(0);
  useAnimatedReaction(
    () => swipedShare(side, translation.get(), rowWidth.get()) > FULL_SWIPE,
    (armed, previous) => {
      if (previous !== null && armed !== previous) {
        armedProgress.set(withTiming(armed ? 1 : 0, { duration: 150 }));
        scheduleOnRN(onArmedChange, armed);
      }
    },
  );
  return armedProgress;
};
