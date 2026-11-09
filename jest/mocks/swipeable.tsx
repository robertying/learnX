import { useImperativeHandle } from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Stand-in for gesture handler's ReanimatedSwipeable: renders its children in
 * a view (testID `swipeable`, with `enabled` on its props) and gives the ref
 * mocked `openRight` / `close`, so tests can see a long press open the actions.
 */
const ReanimatedSwipeable = ({
  ref,
  children,
  enabled,
}: ViewProps & { ref?: React.Ref<unknown>; enabled?: boolean }) => {
  useImperativeHandle(ref, () => mockSwipeableMethods, []);
  return (
    <View testID="swipeable" {...{ enabled }}>
      {children}
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
