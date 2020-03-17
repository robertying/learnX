import Fuse, {FuseOptions, FuseResultWithMatches} from 'fuse.js';
import {useEffect, useState, useCallback} from 'react';
import {Navigation} from 'react-native-navigation';
import {IEntity} from '../types';

function useAndroidSearchBar<T extends IEntity>(
  entities: Array<T>,
  fuseOptions: FuseOptions<T>,
): [string, React.Dispatch<React.SetStateAction<string>>, Array<T>, boolean] {
  const [searchBarText, setSearchBarText] = useState('');

  const [searchResults, setSearchResults] = useState(entities);

  useEffect(() => {
    if (searchBarText) {
      const fuse = new Fuse(entities, fuseOptions);
      const resultsWithMatches = fuse.search<T>(
        searchBarText,
      ) as FuseResultWithMatches<T>[];
      setSearchResults(resultsWithMatches.map(i => i.item));
    } else {
      setSearchResults(entities);
    }
  }, [entities, fuseOptions, searchBarText]);

  const [searchBarVisible, setSearchBarVisible] = useState(false);

  const listener = useCallback(
    ({buttonId}) => {
      if (buttonId === 'search') {
        if (searchBarVisible) {
          setSearchBarText('');
        }
        setSearchBarVisible(!searchBarVisible);
      }
    },
    [searchBarVisible],
  );

  useEffect(() => {
    const handle = Navigation.events().registerNavigationButtonPressedListener(
      listener,
    );
    return () => handle.remove();
  }, [listener]);

  return [searchBarText, setSearchBarText, searchResults, searchBarVisible];
}

export default useAndroidSearchBar;
