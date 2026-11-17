import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Appearance, Keyboard, Platform, View } from 'react-native';

/**
 * How much of a view the Android keyboard covers, for padding the view's
 * bottom by it: give the view `ref`. Measured on the screen, so whatever is
 * under the view (the navigation bar, which hides while the keyboard is up,
 * the gesture bar) counts as it should. Compose's `imePadding` would pad by
 * the keyboard's whole height from the bottom of the screen, leaving a gap
 * above the keyboard as tall as what lies under the view. Always 0 on iOS,
 * where forms keep clear of the keyboard themselves.
 */
const useKeyboardOverlap = () => {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    // The view's bottom moves once the navigation bar hides for the
    // keyboard, so measure again after that.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const measure = (keyboardTop: number) =>
      ref.current?.measureInWindow((_x, y, _width, height) => {
        // The padding is inside the view, so its frame stays put.
        setOverlap(Math.max(0, y + height - keyboardTop));
      });
    const show = Keyboard.addListener('keyboardDidShow', event => {
      const keyboardTop = event.endCoordinates.screenY;
      measure(keyboardTop);
      timers.push(setTimeout(() => measure(keyboardTop), 300));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    // Switching between light and dark restarts the keyboard without a
    // keyboardDidHide, which left the padding behind with no keyboard: start
    // over, and measure again if it's still up.
    const appearance = Appearance.addChangeListener(() => {
      setOverlap(0);
      timers.push(
        setTimeout(() => {
          const metrics = Keyboard.metrics();
          if (Keyboard.isVisible() && metrics) {
            measure(metrics.screenY);
          }
        }, 300),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      show.remove();
      hide.remove();
      appearance.remove();
    };
  }, []);

  return { ref, overlap };
};

export default useKeyboardOverlap;
