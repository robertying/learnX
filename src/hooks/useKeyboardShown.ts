import { useState } from 'react';
import useAndroidKeyboard from 'hooks/useAndroidKeyboard';

/**
 * Whether the Android keyboard is up. Always false on iOS, which keeps its
 * tab bar under the keyboard on its own.
 */
const useKeyboardShown = () => {
  const [shown, setShown] = useState(false);
  useAndroidKeyboard({
    onShow: () => setShown(true),
    onHide: () => setShown(false),
  });
  return shown;
};

export default useKeyboardShown;
