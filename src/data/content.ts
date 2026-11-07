import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { ContentType } from 'thu-learn-lib';
import dayjs from 'dayjs';
import { queryClient, queryPersister } from 'data/queryClient';
import { coursesQuery, getCourseNames, useLoggedIn } from 'data/queries';
import { dataSource } from 'data/source';
import { Notice } from 'data/types/state';
import { useCurrentSemester } from 'data/userData';

/** Adds the course's id and names to each item the server lists for it. */
const tag = <T>(courseId: string, items: object[]) =>
  items.map(item => ({ ...item, courseId, ...getCourseNames(courseId) }) as T);

/** Newest first, then by id, so equal times keep a stable order. */
const byNewest =
  <T extends { id: string }>(time: (item: T) => string) =>
  (items: T[]) => {
    const timestamps = new Map(items.map(i => [i.id, dayjs(time(i)).unix()]));
    return [...items].sort(
      (a, b) =>
        timestamps.get(b.id)! - timestamps.get(a.id)! ||
        b.id.localeCompare(a.id),
    );
  };

/** The semester's course ids, fetching the courses if they aren't cached. */
const courseIdsOf = async (semesterId: string) =>
  (await queryClient.ensureQueryData(coursesQuery(semesterId))).map(c => c.id);

/**
 * Notices, assignments and files work the same way: one list per semester,
 * fetched for all its courses at once, and CourseDetail refreshing a single
 * course's items into it.
 */
const createContent = <T extends { id: string; courseId: string }>({
  name,
  type,
  fetchCourse,
  sort,
}: {
  name: string;
  type: ContentType;
  fetchCourse: (courseId: string) => Promise<object[]>;
  sort: (items: T[]) => T[];
}) => {
  const query = (semesterId: string) =>
    queryOptions({
      queryKey: [name, semesterId] as const,
      queryFn: async () => {
        const results: Record<string, object[]> =
          await dataSource.getAllContents(await courseIdsOf(semesterId), type);
        return sort(
          Object.entries(results).flatMap(([courseId, items]) =>
            tag<T>(courseId, items),
          ),
        );
      },
    });

  /** Replaces one course's items in the semester list and saves it. */
  const refreshCourse = async (semesterId: string, courseId: string) => {
    const items = tag<T>(courseId, await fetchCourse(courseId));
    const { queryKey } = query(semesterId);
    queryClient.setQueryData<T[]>(queryKey, old =>
      sort([...(old ?? []).filter(i => i.courseId !== courseId), ...items]),
    );
    await queryPersister.persistQueryByKey(queryKey, queryClient);
  };

  const empty: T[] = [];

  /** The items of the semester being shown. */
  const useList = () => {
    const loggedIn = useLoggedIn();
    const semesterId = useCurrentSemester();
    const result = useQuery({
      ...query(semesterId ?? ''),
      enabled: loggedIn && !!semesterId,
    });
    return { ...result, items: result.data ?? empty };
  };

  const useItem = (id: string) => useList().items.find(item => item.id === id);

  /** Refreshes one course's items; `isPending` while it runs. */
  const useRefreshCourse = (courseId: string) => {
    const semesterId = useCurrentSemester();
    return useMutation({
      mutationFn: () => refreshCourse(semesterId!, courseId),
    });
  };

  return { query, refreshCourse, useList, useItem, useRefreshCourse };
};

const notices = createContent<Notice>({
  name: 'notices',
  type: ContentType.NOTIFICATION,
  fetchCourse: courseId => dataSource.getNotificationList(courseId),
  sort: byNewest(notice => notice.publishTime),
});

export const noticesQuery = notices.query;
export const refreshCourseNotices = notices.refreshCourse;
export const useNotice = notices.useItem;
export const useRefreshCourseNotices = notices.useRefreshCourse;
export const useNotices = () => {
  const { items, ...result } = notices.useList();
  return { ...result, notices: items };
};
