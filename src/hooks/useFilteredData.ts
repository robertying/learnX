import { useMemo } from 'react';
import { Assignment, File, Notice } from 'data/types/state';

function useFilteredData<T extends Notice | Assignment | File>({
  data,
  fav,
  archived,
  hidden,
}: {
  data: T[];
  fav: string[];
  archived: string[];
  hidden: string[];
}) {
  const _all = useMemo(
    () =>
      data.filter(
        i => !archived.includes(i.id) && !hidden.includes(i.courseId),
      ),
    [data, archived, hidden],
  );

  const _unread = useMemo(
    () =>
      _all.filter(
        i =>
          (i as File).isNew || ((i as Notice).hasRead === false ? true : false),
      ),
    [_all],
  );

  const _fav = useMemo(() => _all.filter(i => fav.includes(i.id)), [_all, fav]);

  const _hidden = useMemo(
    () => data.filter(i => hidden.includes(i.courseId)),
    [hidden, data],
  );

  const _archived = useMemo(
    () => data.filter(i => archived.includes(i.id)),
    [data, archived],
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
