import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { ContentType, CourseType } from 'thu-learn-lib';
import dayjs from 'dayjs';
import { queryClient, queryPersister } from 'data/queryClient';
import { coursesQuery, getCourseNames } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { dataSource } from 'data/source';
import { Assignment, File, Notice } from 'data/types/state';
import { getUserData, useCurrentSemester } from 'data/userData';
import { sortAssignments } from 'helpers/assignments';

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

  /**
   * Changes one cached item of the semester being shown and saves the list,
   * e.g. to mark it read before the next refresh says so.
   */
  const updateItem = (id: string, change: Partial<T>) => {
    const semesterId = getUserData().currentSemester;
    if (!semesterId) {
      return;
    }
    const { queryKey } = query(semesterId);
    const items = queryClient.getQueryData<T[]>(queryKey);
    if (!items?.some(item => item.id === id)) {
      return;
    }
    queryClient.setQueryData<T[]>(queryKey, old =>
      old?.map(item => (item.id === id ? { ...item, ...change } : item)),
    );
    queryPersister.persistQueryByKey(queryKey, queryClient).catch(() => {});
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

  return {
    query,
    refreshCourse,
    updateItem,
    useList,
    useItem,
    useRefreshCourse,
  };
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
/** Opening a notice marks it read on the server; the list shows it now. */
export const markNoticeRead = (id: string) =>
  notices.updateItem(id, { hasRead: true });
export const useNotices = () => {
  const { items, ...result } = notices.useList();
  return { ...result, notices: items };
};

const assignments = createContent<Assignment>({
  name: 'assignments',
  type: ContentType.HOMEWORK,
  fetchCourse: courseId => dataSource.getHomeworkList(courseId),
  sort: sortAssignments,
});

export const assignmentsQuery = assignments.query;
export const refreshCourseAssignments = assignments.refreshCourse;
export const useAssignment = assignments.useItem;
export const useRefreshCourseAssignments = assignments.useRefreshCourse;
export const useAssignments = () => {
  const { items, ...result } = assignments.useList();
  return { ...result, assignments: items };
};

const files = createContent<File>({
  name: 'files',
  type: ContentType.FILE,
  fetchCourse: courseId => dataSource.getFileList(courseId, CourseType.STUDENT),
  sort: byNewest(file => file.uploadTime),
});

export const filesQuery = files.query;
export const refreshCourseFiles = files.refreshCourse;
export const useFile = files.useItem;
export const useRefreshCourseFiles = files.useRefreshCourse;
/** Downloading a file marks it seen on the server; the list shows it now. */
export const markFileSeen = (id: string) =>
  files.updateItem(id, { isNew: false });
export const useFiles = () => {
  const { items, ...result } = files.useList();
  return { ...result, files: items };
};
