import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from 'data/queryKeys';
import { type Course, contentListNames } from 'data/types/state';
import { isLocaleChinese } from 'helpers/i18n';

/**
 * A course's name in the app's language. The server gives both names with
 * every course, so the name doesn't depend on the language the list was
 * fetched in; `name` (the one the server picked) is for a course without
 * them.
 */
export const localizedCourseName = (
  course: Pick<Course, 'name' | 'chineseName' | 'englishName'>,
) =>
  (isLocaleChinese() ? course.chineseName : course.englishName) || course.name;

/**
 * Renames the cached courses, and the course names copied into the cached
 * notices, assignments and files, to the app's language. The cache keeps the
 * names in the language they were fetched in, and courses stay fresh for a
 * day, so after the language changes they would keep the old names until
 * refreshed. Returns the keys of the lists it changed, to be saved.
 */
export const localizeCachedCourseNames = (client: QueryClient) => {
  const changed: QueryKey[] = [];
  /**
   * Maps every list under `queryKey` through `rename`, which returns an item
   * unchanged when its name is already right. A list keeps its time, so it
   * is still refreshed and shown as old as it is.
   */
  const renameAll = <T>(queryKey: QueryKey, rename: (item: T) => T) => {
    for (const [key, items] of client.getQueriesData<T[]>({ queryKey })) {
      const next = items?.map(rename);
      if (next?.some((item, i) => item !== items?.[i])) {
        client.setQueryData(key, next, {
          updatedAt: client.getQueryState(key)?.dataUpdatedAt,
        });
        changed.push(key);
      }
    }
  };

  const names = new Map<string, string>();
  renameAll<Course>(queryKeys.coursesAll, course => {
    const name = localizedCourseName(course);
    names.set(course.id, name);
    return name === course.name ? course : { ...course, name };
  });
  for (const list of contentListNames) {
    renameAll<{ courseId: string; courseName: string }>(
      queryKeys.contentAll(list),
      item => {
        const name = names.get(item.courseId);
        return name === undefined || name === item.courseName
          ? item
          : { ...item, courseName: name };
      },
    );
  }
  return changed;
};
