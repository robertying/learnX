import { fireEvent } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

/**
 * Lays out the view that measures `element`: the nearest one, from `element`
 * up, with an `onLayout`. A layout event doesn't bubble in React Native, so it
 * goes to that view rather than to a text inside it.
 */
export const fireLayout = (
  element: TestInstance,
  layout: { width?: number; height?: number },
) => {
  let node: TestInstance | null = element;
  while (node && !node.props.onLayout) {
    node = node.parent;
  }
  if (!node) {
    throw new Error('No view with onLayout at or above the element');
  }
  return fireEvent(node, 'layout', { nativeEvent: { layout } });
};
