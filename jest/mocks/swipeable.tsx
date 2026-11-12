import { useImperativeHandle } from 'react';
import { View, ViewProps } from 'react-native';

export enum SwipeDirection {
  LEFT = 'left',
  RIGHT = 'right',
}

type RenderActions = (
  progress: unknown,
  translation: unknown,
  methods: typeof mockSwipeableMethods,
) => React.ReactNode;

/**
 * Stand-in for gesture handler's ReanimatedSwipeable: renders its children in
 * a view (testID `swipeable`, with `enabled` and its swipe callbacks on its
 * props, for tests to call) and gives the ref mocked `openRight` / `close`.
 * Both sides' actions are drawn as if swiped open (in `swipe-actions-left`
 * and `swipe-actions-right`), but hidden from queries as a closed swipe's
 * are: find them with `includeHiddenElements`.
 */
const swiped = { get: () => 0, set: () => {} };
const ReanimatedSwipeable = ({
  ref,
  children,
  enabled,
  renderLeftActions,
  renderRightActions,
  onSwipeableWillOpen,
  onSwipeableOpen,
  onSwipeableWillClose,
}: ViewProps & {
  ref?: React.Ref<unknown>;
  enabled?: boolean;
  renderLeftActions?: RenderActions;
  renderRightActions?: RenderActions;
  onSwipeableWillOpen?: (direction: SwipeDirection) => void;
  onSwipeableOpen?: (direction: SwipeDirection) => void;
  onSwipeableWillClose?: (direction: SwipeDirection) => void;
}) => {
  useImperativeHandle(ref, () => mockSwipeableMethods, []);
  return (
    <View
      testID="swipeable"
      {...{
        enabled,
        onSwipeableWillOpen,
        onSwipeableOpen,
        onSwipeableWillClose,
      }}
    >
      {children}
      {(['left', 'right'] as const).map(side => (
        <View
          key={side}
          testID={`swipe-actions-${side}`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {(side === 'left' ? renderLeftActions : renderRightActions)?.(
            swiped,
            swiped,
            mockSwipeableMethods,
          )}
        </View>
      ))}
    </View>
  );
};

export const mockSwipeableMethods = {
  openLeft: jest.fn(),
  openRight: jest.fn(),
  close: jest.fn(),
  reset: jest.fn(),
};

export default ReanimatedSwipeable;
