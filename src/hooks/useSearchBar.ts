import Fuse, { FuseOptions } from "fuse.js";
import { useEffect, useState } from "react";
import { Navigation } from "react-native-navigation";
import {
  IAssignment,
  IFile,
  INotice,
  withCourseInfo
} from "../redux/types/state";

type IEntity = withCourseInfo<INotice | IFile | IAssignment>;

const filter = (
  entities: ReadonlyArray<IEntity>,
  pinned: readonly string[],
  hidden: readonly string[]
) => {
  return [
    ...entities.filter(item => pinned.includes(item.id)),
    ...entities
      .filter(item => !hidden.includes(item.courseId))
      .filter(item => !pinned.includes(item.id))
  ];
};

function useSearchBar<T>(
  entities: ReadonlyArray<IEntity>,
  pinned: readonly string[],
  hidden: readonly string[],
  fuseOptions: FuseOptions<T>
): ReadonlyArray<IEntity> {
  const [searchResults, setSearchResults] = useState(
    filter(entities, pinned, hidden)
  );

  useEffect(() => {
    setSearchResults(filter(entities, pinned, hidden));
  }, [entities.length, pinned.length, hidden.length]);

  useEffect(() => {
    const listener = Navigation.events().registerSearchBarUpdatedListener(
      ({ text }) => {
        if (text) {
          const fuse = new Fuse(entities, fuseOptions);
          setSearchResults(fuse.search(text));
        } else {
          setSearchResults(filter(entities, pinned, hidden));
        }
      }
    );
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const listener = Navigation.events().registerSearchBarCancelPressedListener(
      () => {
        setSearchResults(filter(entities, pinned, hidden));
      }
    );
    return () => listener.remove();
  }, []);

  return searchResults;
}

export default useSearchBar;
