import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from 'data/storage';

export const USER_DATA_KEY = 'userData';

/** Items the user can favorite and archive. */
export type BookmarkType = 'notice' | 'assignment' | 'file';

export const bookmarkTypes = [
  'notice',
  'assignment',
  'file',
] as const satisfies readonly BookmarkType[];

/** What the user has done to their courses and their content, by id. */
export interface UserData {
  favorites: Record<BookmarkType, string[]>;
  archived: Record<BookmarkType, string[]>;
  hiddenCourses: string[];
  /** Course ids in the order the user dragged them into. */
  courseOrder: string[];
}

export const emptyUserData = (): UserData => ({
  favorites: { notice: [], assignment: [], file: [] },
  archived: { notice: [], assignment: [], file: [] },
  hiddenCourses: [],
  courseOrder: [],
});

/** Lays saved user data over the current, keeping lists that are missing. */
export const mergeUserData = (
  current: UserData,
  saved: Partial<UserData>,
): UserData => ({
  ...current,
  ...saved,
  favorites: { ...current.favorites, ...saved.favorites },
  archived: { ...current.archived, ...saved.archived },
});

export const useUserDataStore = create<UserData>()(
  persist(emptyUserData, {
    name: USER_DATA_KEY,
    version: 1,
    storage: persistStorage,
    merge: (saved, current) =>
      mergeUserData(current, (saved ?? {}) as Partial<UserData>),
  }),
);

export const useUserData = <T>(selector: (data: UserData) => T) =>
  useUserDataStore(selector);

export const getUserData = () => useUserDataStore.getState();

/** Replaces all user data, e.g. on logout or when the mock account loads. */
export const resetUserData = (data: UserData = emptyUserData()) => {
  useUserDataStore.setState(data, true);
};

const toggle = (list: string[], ids: string[], flag: boolean) => {
  if (flag) {
    const existing = new Set(list);
    return [...list, ...new Set(ids.filter(id => !existing.has(id)))];
  }
  const removed = new Set(ids);
  return list.filter(id => !removed.has(id));
};

export const setFavorite = (type: BookmarkType, id: string, flag: boolean) => {
  useUserDataStore.setState(state => ({
    favorites: {
      ...state.favorites,
      [type]: toggle(state.favorites[type], [id], flag),
    },
  }));
};

export const setArchived = (
  type: BookmarkType,
  ids: string[],
  flag: boolean,
) => {
  useUserDataStore.setState(state => ({
    archived: {
      ...state.archived,
      [type]: toggle(state.archived[type], ids, flag),
    },
  }));
};

export const setCourseHidden = (courseId: string, flag: boolean) => {
  useUserDataStore.setState(state => ({
    hiddenCourses: toggle(state.hiddenCourses, [courseId], flag),
  }));
};

export const setCourseOrder = (courseIds: string[]) => {
  useUserDataStore.setState({ courseOrder: courseIds });
};
