import { useLayoutEffect } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { getTitleOptions } from 'components/HeaderTitle';

/**
 * Sets the header title from data the screen reads itself (e.g. from the
 * store), so that it stays current as the data changes.
 */
const useHeaderTitle = (
  navigation: {
    setOptions: (options: Partial<NativeStackNavigationOptions>) => void;
  },
  title = '',
  subtitle?: string,
) => {
  useLayoutEffect(() => {
    navigation.setOptions(getTitleOptions(title, subtitle));
  }, [navigation, title, subtitle]);
};

export default useHeaderTitle;
