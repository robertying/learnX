import { useMemo } from 'react';
import { Assignment, File, Notice } from 'data/types/state';

function useFilteredData<T extends Notice | Assignment | File>({
  data,
  archived,
  hidden,
}: {
  data: T[];
  archived: string[];
  hidden: string[];
}) {
  const archivedSet = useMemo(() => new Set(archived), [archived]);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const _all = useMemo(
    () =>
      data.filter(i => !archivedSet.has(i.id) && !hiddenSet.has(i.courseId)),
    [data, archivedSet, hiddenSet],
  );

  const _unread = useMemo(
    () =>
      _all.filter(
        i =>
          (i as File).isNew || ((i as Notice).hasRead === false ? true : false),
      ),
    [_all],
  );

  // The website's favorites (我的收藏), as the server lists them.
  const _fav = useMemo(() => _all.filter(i => i.isFavorite), [_all]);

  const _hidden = useMemo(
    () => data.filter(i => hiddenSet.has(i.courseId)),
    [hiddenSet, data],
  );

  const _archived = useMemo(
    () => data.filter(i => archivedSet.has(i.id)),
    [data, archivedSet],
  );

  const _unfinished = useMemo(
    () => _all.filter(i => !(i as Assignment).submitted),
    [_all],
  );

  const _finished = useMemo(
    () => _all.filter(i => (i as Assignment).submitted),
    [_all],
  );

  return {
    all: _all,
    unread: _unread,
    fav: _fav,
    archived: _archived,
    hidden: _hidden,
    unfinished: _unfinished,
    finished: _finished,
  };
}

export default useFilteredData;
