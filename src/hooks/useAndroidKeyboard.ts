import { useEffect, useEffectEvent } from 'react';
import { Appearance, Keyboard } from 'react-native';
import { isAndroid } from 'helpers/platform';

export interface AndroidKeyboardHandlers {
  /** The keyboard is up, its top at `top` on the screen. */
  onShow?: (top: number) => void;
  /** The keyboard went away. */
  onHide?: () => void;
}

/**
 * Follows the Android keyboard, for whatever makes room for it in JS (the
 * bottom navigation bar, a Form, Search's results) or lets go of a field when
 * it goes (Back puts the keyboard away and leaves the field focused). Android
 * only sends the Did events. Switching between light and dark restarts the
 * keyboard without a keyboardDidHide: that counts as the keyboard going, and
 * as it coming back if it's still up once restarted. Nothing on iOS and Mac,
 * where the system keeps out of the keyboard's way itself.
 */
const useAndroidKeyboard = ({ onShow, onHide }: AndroidKeyboardHandlers) => {
  const show = useEffectEvent((top: number) => onShow?.(top));
  const hide = useEffectEvent(() => onHide?.());

  useEffect(() => {
    if (!isAndroid()) {
      return;
    }
    let restarted: ReturnType<typeof setTimeout> | undefined;
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', event =>
        show(event.endCoordinates.screenY),
      ),
      Keyboard.addListener('keyboardDidHide', () => hide()),
      Appearance.addChangeListener(() => {
        hide();
        clearTimeout(restarted);
        restarted = setTimeout(() => {
          const metrics = Keyboard.metrics();
          if (Keyboard.isVisible() && metrics) {
            show(metrics.screenY);
          }
        }, 300);
      }),
    ];
    return () => {
      clearTimeout(restarted);
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, []);
};

export default useAndroidKeyboard;
