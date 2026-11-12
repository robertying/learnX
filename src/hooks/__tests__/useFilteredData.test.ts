import { renderHook } from '@testing-library/react-native';
import { Assignment } from 'data/types/state';
import { File, Notice } from 'data/types/state';
import useFilteredData, {
  assignmentLists,
  fileLists,
  noticeLists,
} from 'hooks/useFilteredData';

const assignment = (
  id: string,
  courseId: string,
  extra: Partial<Assignment> = {},
) =>
  ({
    id,
    courseId,
    submitted: false,
    isFavorite: false,
    ...extra,
  }) as Assignment;

const data = [
  assignment('a', 'c1'),
  assignment('b', 'c1', { submitted: true, isFavorite: true }),
  assignment('c', 'c2'),
  assignment('d', 'c1', { submitted: true }),
];

describe('useFilteredData', () => {
  it('splits the items into their filters', async () => {
    const { result } = await renderHook(
      useFilteredData<Assignment, 'unfinished' | 'finished'>,
      {
        initialProps: {
          data,
          archived: ['d'],
          hidden: ['c2'],
          lists: assignmentLists,
        },
      },
    );
    const ids = (items: Assignment[]) => items.map(item => item.id);
    expect(ids(result.current.all)).toEqual(['a', 'b']);
    expect(ids(result.current.fav)).toEqual(['b']);
    expect(ids(result.current.archived)).toEqual(['d']);
    expect(ids(result.current.hidden)).toEqual(['c']);
    expect(ids(result.current.unfinished)).toEqual(['a']);
    expect(ids(result.current.finished)).toEqual(['b']);
  });

  it('keeps each list while its inputs stay the same', async () => {
    const props = { data, archived: [], hidden: [], lists: assignmentLists };
    const { result, rerender } = await renderHook(
      useFilteredData<Assignment, 'unfinished' | 'finished'>,
      { initialProps: props },
    );
    const before = result.current;
    await rerender({ ...props });
    expect(result.current.all).toBe(before.all);
    expect(result.current.unfinished).toBe(before.unfinished);
  });

  it('works without lists of its own', async () => {
    const { result } = await renderHook(useFilteredData<Assignment>, {
      initialProps: { data, archived: [], hidden: [] },
    });
    expect(result.current.all).toHaveLength(4);
    expect(Object.keys(result.current).sort()).toEqual([
      'all',
      'archived',
      'fav',
      'hidden',
    ]);
  });
});

describe('noticeLists and fileLists', () => {
  it('put unread notices and new files in Unread', () => {
    expect(noticeLists.unread({ hasRead: false } as Notice)).toBe(true);
    expect(noticeLists.unread({ hasRead: true } as Notice)).toBe(false);
    expect(fileLists.unread({ isNew: true } as File)).toBe(true);
    expect(fileLists.unread({ isNew: false } as File)).toBe(false);
  });
});
