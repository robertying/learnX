import { type ComponentRef, useEffect, useRef, type RefObject } from 'react';
import {
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';
import Spacing from 'constants/Spacing';
import { isApple } from 'helpers/platform';

/**
 * Keeps a whole view (a group of fields) above the iOS keyboard while one of
 * its fields has focus. A scroll view with `automaticallyAdjustKeyboardInsets`
 * only scrolls the focused text field into view, so the rest of a group, such
 * as its padding and the next field, stays under the keyboard. Once the
 * keyboard is up, this scrolls on until the view and a margin clear it.
 *
 * Pass the returned `onScroll` (with `scrollEventThrottle`) to the scroll view.
 * Android pages avoid the keyboard with `KeyboardAvoidingView`, so this does
 * nothing there.
 */
const useKeepAboveKeyboard = (
  scrollView: RefObject<ComponentRef<typeof ScrollView> | null>,
  view: RefObject<ComponentRef<typeof View> | null>,
  margin = Spacing.m,
) => {
  const offset = useRef(0);

  useEffect(() => {
    if (!isApple()) {
      return;
    }
    const subscription = Keyboard.addListener('keyboardDidShow', event => {
      // The keyboard's top is in screen coordinates and the view's in the
      // window's. In an iPad window that doesn't start at the screen's top,
      // the view seems higher than it is and this scrolls less, never too far.
      const keyboardTop = event.endCoordinates.screenY;
      view.current?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height + margin - keyboardTop;
        if (overlap > 0) {
          scrollView.current?.scrollTo({
            y: offset.current + overlap,
            animated: true,
          });
        }
      });
    });
    return () => subscription.remove();
  }, [scrollView, view, margin]);

  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  };
};

export default useKeepAboveKeyboard;
