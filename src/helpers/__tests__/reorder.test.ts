import { sortByOrder } from 'helpers/reorder';

const items = (...ids: string[]) => ids.map(id => ({ id }));

describe('sortByOrder', () => {
  it('orders items by the given ids', () => {
    expect(sortByOrder(items('a', 'b', 'c'), ['c', 'a', 'b'])).toEqual(
      items('c', 'a', 'b'),
    );
  });

  it('appends items missing from the order in their original order', () => {
    expect(sortByOrder(items('a', 'b', 'c', 'd'), ['c', 'a'])).toEqual(
      items('c', 'a', 'b', 'd'),
    );
  });

  it('ignores ids without a matching item and duplicate ids', () => {
    expect(sortByOrder(items('a', 'b'), ['x', 'b', 'b', 'a'])).toEqual(
      items('b', 'a'),
    );
  });
});
