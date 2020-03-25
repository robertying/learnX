import {IFuseOptions} from 'fuse.js';
import {Platform} from 'react-native';
import useAndroidSearchBar from './useAndroidSearchBar';
import useIosSearchBar from './useIosSearchBar';
import {IEntity} from '../types';

function useSearchBar<T extends IEntity>(
  entities: Array<T>,
  fuseOptions: IFuseOptions<T>,
): [
  T[],
  string | undefined,
  React.Dispatch<React.SetStateAction<string>> | undefined,
  boolean | undefined,
] {
  const iosSearchResults = useIosSearchBar<T>(entities, fuseOptions);

  const [
    searchBarText,
    setSearchBarText,
    androidSearchResults,
    searchBarVisible,
  ] = useAndroidSearchBar<T>(entities, fuseOptions);

  return Platform.OS === 'ios'
    ? [iosSearchResults, undefined, undefined, undefined]
    : [androidSearchResults, searchBarText, setSearchBarText, searchBarVisible];
}

export default useSearchBar;
