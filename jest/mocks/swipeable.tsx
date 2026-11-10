import { useImperativeHandle } from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Stand-in for gesture handler's ReanimatedSwipeable: renders its children in
 * a view (testID `swipeable`, with `enabled` on its props) and gives the ref
 * mocked `openRight` / `close`, so tests can see a long press open the actions.
 * The right actions are drawn as if swiped open, but hidden from queries as
 * a closed swipe's are: find them with `includeHiddenElements`.
 */
const swiped = { get: () => 0, set: () => {} };
const ReanimatedSwipeable = ({
  ref,
  children,
  enabled,
  renderRightActions,
}: ViewProps & {
  ref?: React.Ref<unknown>;
  enabled?: boolean;
  renderRightActions?: (
    progress: unknown,
    translation: unknown,
    methods: typeof mockSwipeableMethods,
  ) => React.ReactNode;
}) => {
  useImperativeHandle(ref, () => mockSwipeableMethods, []);
  return (
    <View testID="swipeable" {...{ enabled }}>
      {children}
      <View
        testID="swipe-actions"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {renderRightActions?.(swiped, swiped, mockSwipeableMethods)}
      </View>
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
