import { useMemo } from 'react';
import { Assignment, File, Notice } from 'data/types/state';

type Item = Notice | Assignment | File;

/** Which items of the shown ones go in a kind's own filters. */
export type ExtraLists<T, K extends string> = Readonly<
  Record<K, (item: T) => boolean>
>;

/** Notices' own filter. */
export const noticeLists = {
  unread: (notice: Notice) => !notice.hasRead,
} satisfies ExtraLists<Notice, string>;

/** Assignments' own filters. */
export const assignmentLists = {
  unfinished: (assignment: Assignment) => !assignment.submitted,
  finished: (assignment: Assignment) => assignment.submitted,
} satisfies ExtraLists<Assignment, string>;

/** Files' own filter. */
export const fileLists = {
  unread: (file: File) => file.isNew,
} satisfies ExtraLists<File, string>;

/**
 * Splits a list into its filters: everything shown (`all`: not archived, not
 * in a hidden course), the server's favorites among those, the archived and
 * the hidden ones, and the kind's own `lists` among the shown ones (pass a
 * module-level constant such as `noticeLists`, so they're only recomputed when
 * the data changes). Each list keeps its identity until its inputs change,
 * since screens use them as effect dependencies.
 */
function useFilteredData<T extends Item, K extends string = never>({
  data,
  archived,
  hidden,
  lists,
}: {
  data: T[];
  archived: string[];
  hidden: string[];
  lists?: ExtraLists<T, K>;
}) {
  const archivedSet = useMemo(() => new Set(archived), [archived]);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const all = useMemo(
    () =>
      data.filter(i => !archivedSet.has(i.id) && !hiddenSet.has(i.courseId)),
    [data, archivedSet, hiddenSet],
  );

  // The website's favorites (我的收藏), as the server lists them.
  const fav = useMemo(() => all.filter(i => i.isFavorite), [all]);

  const hiddenItems = useMemo(
    () => data.filter(i => hiddenSet.has(i.courseId)),
    [hiddenSet, data],
  );

  const archivedItems = useMemo(
    () => data.filter(i => archivedSet.has(i.id)),
    [data, archivedSet],
  );

  const extra = useMemo(
    () =>
      Object.fromEntries(
        Object.entries<(item: T) => boolean>(lists ?? {}).map(
          ([name, include]) => [name, all.filter(include)],
        ),
      ) as Record<K, T[]>,
    [all, lists],
  );

  return {
    all,
    fav,
    archived: archivedItems,
    hidden: hiddenItems,
    ...extra,
  };
}

export default useFilteredData;
