import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { t } from 'helpers/i18n';
import { headerButtons } from 'navigation/headerButtons';
import { isAndroid } from 'helpers/platform';

/**
 * How a focused number field lets go of the keyboard, or null when none is
 * focused. A Form's number field reports it through this context.
 */
export const NumberFieldFocusContext = createContext<
  ((release: (() => void) | null) => void) | null
>(null);

/** For a number field: reports its focus to the Form it's in. */
export const useNumberFieldFocus = () => useContext(NumberFieldFocusContext);

/**
 * Done (a checkmark) in the header while a number field in a Form is
 * focused: the number pad has no return key on iOS, and the keyboard's own ✓
 * is easy to miss on Android.
 * Returns what the Form provides to its fields through
 * `NumberFieldFocusContext`.
 */
const useNumberFieldDone = () => {
  // Optional: a Form outside a navigator (as in tests) has no header.
  const navigation = useContext(NavigationContext);
  const release = useRef<(() => void) | null>(null);
  const [focused, setFocused] = useState(false);
  const report = (next: (() => void) | null) => {
    release.current = next;
    setFocused(!!next);
  };

  // On Android the back gesture puts the keyboard away and leaves the field
  // focused: it lets go then too, so Done doesn't stay behind.
  const onKeyboardHidden = useEffectEvent(() => release.current?.());
  useEffect(() => {
    if (!isAndroid()) {
      return;
    }
    const subscription = Keyboard.addListener('keyboardDidHide', () =>
      onKeyboardHidden(),
    );
    return () => subscription.remove();
  }, []);

  const shown = useRef(false);
  useLayoutEffect(() => {
    if (!focused && !shown.current) {
      return;
    }
    shown.current = focused;
    navigation?.setOptions(
      headerButtons(
        'right',
        focused
          ? [
              {
                id: 'keyboard-done',
                label: t('done'),
                icon: 'confirm',
                onPress: () => release.current?.(),
                testID: 'keyboard-done',
              },
            ]
          : [],
      ),
    );
  }, [navigation, focused]);

  return report;
};

export default useNumberFieldDone;
