import Fuse, {FuseOptions} from 'fuse.js';
import {useEffect, useState, useCallback} from 'react';
import {Navigation} from 'react-native-navigation';
import {IEntity} from '../types';

function useIosSearchBar<T extends IEntity>(
  entities: Array<T>,
  fuseOptions: FuseOptions<T>,
): Array<T> {
  const [searchResults, setSearchResults] = useState(entities);

  useEffect(() => {
    setSearchResults(entities);
  }, [entities]);

  const searchBarUpdatedListener = useCallback(
    ({text}) => {
      if (text) {
        const fuse = new Fuse(entities, fuseOptions);
        setSearchResults(fuse.search(text) as T[]);
      }
    },
    [entities, fuseOptions],
  );

  useEffect(() => {
    const handle = Navigation.events().registerSearchBarUpdatedListener(
      searchBarUpdatedListener,
    );
    return () => handle.remove();
  }, [searchBarUpdatedListener]);

  const searchBarCancelPressedListener = useCallback(
    () => setSearchResults(entities),
    [entities],
  );

  useEffect(() => {
    const handle = Navigation.events().registerSearchBarCancelPressedListener(
      searchBarCancelPressedListener,
    );
    return () => handle.remove();
  }, [searchBarCancelPressedListener]);

  return searchResults;
}

export default useIosSearchBar;
