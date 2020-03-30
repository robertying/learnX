import {useEffect, useState} from 'react';
import {Dimensions, ScaledSize} from 'react-native';

export function useWindow() {
  const [window, setWindow] = useState<ScaledSize>(Dimensions.get('window'));

  const listener = ({window}: {window: ScaledSize}) => {
    setWindow(window);
  };

  useEffect(() => {
    Dimensions.addEventListener('change', listener);
    return () => Dimensions.removeEventListener('change', listener);
  }, []);

  return window;
}
