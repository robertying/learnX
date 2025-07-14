export const sortByOrder = <T extends { id: string }>(
  items: T[],
  order: string[],
) => {
  const itemMap = items.reduce((acc, item) => {
    acc.set(item.id, item);
    return acc;
  }, new Map<string, T>());

  const orderedItems: T[] = [];
  for (const itemId of order) {
    if (itemMap.has(itemId)) {
      orderedItems.push(itemMap.get(itemId)!);
      itemMap.delete(itemId);
    }
  }
  for (const item of itemMap.values()) {
    orderedItems.push(item);
  }

  return orderedItems;
};
