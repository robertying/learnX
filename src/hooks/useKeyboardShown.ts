import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { isAndroid } from 'helpers/platform';

// Android only fires the Did events; iOS keeps its tab bar under the keyboard
// on its own, so there this is always false.
const useKeyboardShown = () => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isAndroid()) {
      return;
    }

    const show = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return shown;
};

export default useKeyboardShown;
