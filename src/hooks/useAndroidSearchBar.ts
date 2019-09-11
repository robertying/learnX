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

function useAndroidSearchBar<T extends IEntity>(
  entities: ReadonlyArray<T>,
  pinned: readonly string[],
  hidden: readonly string[],
  fuseOptions: FuseOptions<T>,
): readonly [
  string,
  React.Dispatch<React.SetStateAction<string>>,
  ReadonlyArray<T>,
  boolean,
] {
  const [searchResults, setSearchResults] = useState(
    filter<T>(entities, pinned, hidden),
  );

  useEffect(() => {
    setSearchResults(filter<T>(entities, pinned, hidden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities.length, pinned.length, hidden.length]);

  const [searchBarText, setSearchBarText] = useState('');

  useEffect(() => {
    if (searchBarText) {
      const fuse = new Fuse(entities, fuseOptions);
      setSearchResults(fuse.search(searchBarText));
    } else {
      setSearchResults(filter<T>(entities, pinned, hidden));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchBarText]);

  const [searchBarVisible, setSearchBarVisible] = useState(false);

  useEffect(() => {
    const listener = Navigation.events().registerNavigationButtonPressedListener(
      ({buttonId}) => {
        if (buttonId === 'search') {
          if (searchBarVisible) {
            setSearchBarText('');
          }
          setSearchBarVisible(!searchBarVisible);
        }
      },
    );
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [searchBarText, setSearchBarText, searchResults, searchBarVisible];
}

export default useAndroidSearchBar;
