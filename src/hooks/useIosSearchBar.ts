import Fuse, {FuseOptions} from 'fuse.js';
import {useEffect, useState} from 'react';
import {Navigation} from 'react-native-navigation';
import {
  IAssignment,
  IFile,
  INotice,
  withCourseInfo,
} from '../redux/types/state';

type IEntity =
  | withCourseInfo<INotice>
  | withCourseInfo<IFile>
  | withCourseInfo<IAssignment>;

function filter<T extends IEntity>(
  entities: ReadonlyArray<T>,
  pinned: readonly string[],
  hidden: readonly string[],
): ReadonlyArray<T> {
  return [
    ...entities.filter(item => pinned.includes(item.id)),
    ...entities
      .filter(item => !hidden.includes(item.courseId))
      .filter(item => !pinned.includes(item.id)),
  ];
}

function useIosSearchBar<T extends IEntity>(
  entities: ReadonlyArray<T>,
  pinned: readonly string[],
  hidden: readonly string[],
  fuseOptions: FuseOptions<T>,
): ReadonlyArray<T> {
  const [searchResults, setSearchResults] = useState(
    filter<T>(entities, pinned, hidden),
  );

  useEffect(() => {
    setSearchResults(filter<T>(entities, pinned, hidden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities.length, pinned.length, hidden.length]);

  useEffect(() => {
    const listener = Navigation.events().registerSearchBarUpdatedListener(
      ({text}) => {
        if (text) {
          const fuse = new Fuse(entities, fuseOptions);
          setSearchResults(fuse.search(text));
        } else {
          setSearchResults(filter<T>(entities, pinned, hidden));
        }
      },
    );
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listener = Navigation.events().registerSearchBarCancelPressedListener(
      () => {
        setSearchResults(filter<T>(entities, pinned, hidden));
      },
    );
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return searchResults;
}

export default useIosSearchBar;
