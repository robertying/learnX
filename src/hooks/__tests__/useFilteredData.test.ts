import { renderHook } from '@testing-library/react-native';
import { Assignment } from 'data/types/state';
import useFilteredData, { assignmentLists } from 'hooks/useFilteredData';

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
});
