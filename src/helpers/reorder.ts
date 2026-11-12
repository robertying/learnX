/**
 * `items` in the order of the ids in `order`; items whose id isn't in it
 * follow in their own order (a course added after the user reordered).
 */
export const sortByOrder = <T extends { id: string }>(
  items: T[],
  order: string[],
) => {
  const itemMap = new Map(items.map(item => [item.id, item]));

  const orderedItems: T[] = [];
  for (const itemId of order) {
    const item = itemMap.get(itemId);
    if (item) {
      orderedItems.push(item);
      itemMap.delete(itemId);
    }
  }
  return [...orderedItems, ...itemMap.values()];
};
