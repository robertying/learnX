import { FuseOptions } from "fuse.js";
import { Platform } from "react-native";
import {
  IAssignment,
  IFile,
  INotice,
  withCourseInfo
} from "../redux/types/state";
import useAndroidSearchBar from "./useAndroidSearchBar";
import useIosSearchBar from "./useIosSearchBar";

type IEntity =
  | withCourseInfo<INotice>
  | withCourseInfo<IFile>
  | withCourseInfo<IAssignment>;

function useSearchBar<T extends IEntity>(
  entities: ReadonlyArray<T>,
  pinned: readonly string[],
  hidden: readonly string[],
  fuseOptions: FuseOptions<T>
): readonly [
  readonly T[],
  string | undefined,
  React.Dispatch<React.SetStateAction<string>> | undefined,
  boolean | undefined
] {
  const iosSearchResults = useIosSearchBar<T>(
    entities,
    pinned,
    hidden,
    fuseOptions
  );

  const [
    searchBarText,
    setSearchBarText,
    androidSearchResults,
    searchBarVisible
  ] = useAndroidSearchBar<T>(entities, pinned, hidden, fuseOptions);

  return Platform.OS === "ios"
    ? [iosSearchResults, undefined, undefined, undefined]
    : [androidSearchResults, searchBarText, setSearchBarText, searchBarVisible];
}

export default useSearchBar;
