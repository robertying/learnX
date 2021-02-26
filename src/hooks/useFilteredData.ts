import {useMemo} from 'react';
import {Assignment, File, Notice} from 'data/types/state';

function useFilteredData<T extends Notice | Assignment | File>(
  data: T[],
  unread: string[],
  fav: string[],
  archived: string[],
  pinned: string[],
  hidden: string[],
) {
  const _all = useMemo(() => {
    const all = data.filter(
      (i) => !archived.includes(i.id) && !hidden.includes(i.courseId),
    );
    return [
      ...all.filter((i) => pinned.includes(i.id)),
      ...all.filter((i) => !pinned.includes(i.id)),
    ];
  }, [data, archived, hidden, pinned]);

  const _unread = useMemo(() => _all.filter((i) => unread.includes(i.id)), [
    _all,
    unread,
  ]);

  const _fav = useMemo(() => _all.filter((i) => fav.includes(i.id)), [
    _all,
    fav,
  ]);

  const _hidden = useMemo(
    () => data.filter((i) => hidden.includes(i.courseId)),
    [hidden, data],
  );

  const _archived = useMemo(() => data.filter((i) => archived.includes(i.id)), [
    data,
    archived,
  ]);

  const _unfinished = useMemo(
    () => data.filter((i) => !(i as Assignment).submitted),
    [data],
  );

  const _finished = useMemo(
    () => data.filter((i) => (i as Assignment).submitted),
    [data],
  );

  return [_all, _unread, _fav, _archived, _hidden, _unfinished, _finished];
}

export default useFilteredData;
