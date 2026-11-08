import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Android only fires the Did events; iOS keeps its tab bar under the keyboard
// on its own, so there this is always false.
const useKeyboardShown = () => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
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
