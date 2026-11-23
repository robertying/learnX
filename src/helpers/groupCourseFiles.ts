import type { File } from 'data/types/state';

export interface FileCategoryHeading {
  key: string;
  heading: string;
}

/**
 * Files arrive newest first. Keeping each category in the order it first
 * appears puts the category with the latest upload at the top.
 */
export const groupCourseFiles = (
  files: readonly File[],
  uncategorizedTitle: string,
): (File | FileCategoryHeading)[] => {
  const categories = new Map<string, (File | FileCategoryHeading)[]>();
  const uncategorized: File[] = [];
  for (const file of files) {
    const category = file.category;
    if (!category?.title.trim()) {
      uncategorized.push(file);
      continue;
    }
    const group = categories.get(category.id);
    if (group) {
      group.push(file);
    } else {
      categories.set(category.id, [
        { key: `category:${category.id}`, heading: category.title },
        file,
      ]);
    }
  }

  const groups = [...categories.values()];
  if (uncategorized.length) {
    groups.push([
      { key: 'uncategorized', heading: uncategorizedTitle },
      ...uncategorized,
    ]);
  }
  return groups.flat();
};
