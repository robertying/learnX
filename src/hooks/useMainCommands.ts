import { useIsFocused, useNavigation } from '@react-navigation/native';
import useAppCommand from 'hooks/useAppCommand';

/**
 * Search (⌘F) and Settings… (⌘,) from the menu bar on iPad and Mac. Only
 * while the main UI is on top, so that a sheet such as a submission in
 * progress isn't closed for them.
 */
const useMainCommands = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useAppCommand(
    'search',
    () => navigation.navigate('SearchStack', { screen: 'Search' }),
    isFocused,
  );
  useAppCommand(
    'settings',
    () =>
      navigation.navigate('MainTab', {
        screen: 'SettingStack',
        params: { screen: 'Settings' },
      }),
    isFocused,
  );
};

export default useMainCommands;
