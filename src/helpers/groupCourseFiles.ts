import type { File } from 'data/types/state';

export interface FileCategoryHeading {
  key: string;
  heading: string;
  expanded: boolean;
}

/**
 * Files arrive newest first. Keeping each category in the order it first
 * appears puts the category with the latest upload at the top.
 */
export const groupCourseFiles = (
  files: readonly File[],
  uncategorizedTitle: string,
  collapsedKeys: readonly string[] = [],
): (File | FileCategoryHeading)[] => {
  const groups = new Map<string, [FileCategoryHeading, ...File[]]>();
  const uncategorizedKey = 'uncategorized';
  const collapsed = new Set(collapsedKeys);
  for (const file of files) {
    const category = file.category?.title.trim() ? file.category : undefined;
    const key = category ? `category:${category.id}` : uncategorizedKey;
    let group = groups.get(key);
    if (!group) {
      group = [
        {
          key,
          heading: category?.title ?? uncategorizedTitle,
          expanded: !collapsed.has(key),
        },
      ];
      groups.set(key, group);
    }
    if (group[0].expanded) {
      group.push(file);
    }
  }

  const uncategorized = groups.get(uncategorizedKey);
  if (uncategorized) {
    groups.delete(uncategorizedKey);
    groups.set(uncategorizedKey, uncategorized);
  }
  return [...groups.values()].flat();
};
