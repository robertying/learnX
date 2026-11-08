import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import {
  CourseType,
  type ExcellentHomework,
  type Homework,
  type IHomework,
  type IHomeworkDetail,
  type Notification,
} from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import { queryClient, queryPersister } from 'data/queryClient';
import { coursesQuery, getCourseNames } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { dataSource } from 'data/source';
import { Assignment, File, Notice } from 'data/types/state';
import { getUserData, useCurrentSemester } from 'data/userData';
import { sortAssignments } from 'helpers/assignments';
import { createLimiter } from 'helpers/limiter';

/**
 * Course lists fetched at once, across notices, assignments and files. A
 * course's assignments take a few requests plus two per new or changed
 * assignment, so a few courses keep the connections busy, and the server
 * isn't hit with every course of every list at the same moment.
 */
const courseFetches = createLimiter(4);

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
 * fetched course by course (a course that fails keeps its cached items; the
 * list fails only when every course does), and CourseDetail refreshing a single
 * course's items into it.
 */
const createContent = <T extends { id: string; courseId: string }>({
  name,
  fetchCourse: fetchFromServer,
  sort,
  priority,
}: {
  name: string;
  /**
   * Fetches a course's items. `cached` holds what the list has for the course
   * (possibly nothing), to skip the per-item requests for items that didn't
   * change and fill those items in from it.
   */
  fetchCourse: (courseId: string, cached: T[]) => Promise<object[]>;
  sort: (items: T[]) => T[];
  /** Lower lists get their courses fetched first when several refresh. */
  priority: number;
}) => {
  /**
   * Changes made in the app (marking an item read) that the server may not
   * report yet, applied to every response for the rest of the session, so a
   * fetch that was already under way doesn't undo them.
   */
  const overrides = new Map<string, Partial<T>>();
  const withOverrides = (items: T[]) =>
    overrides.size === 0
      ? items
      : items.map(item => {
          const change = overrides.get(item.id);
          return change ? { ...item, ...change } : item;
        });

  /** Fetches a course's items, reusing what the semester list has cached. */
  const fetchCourse = (semesterId: string, courseId: string) =>
    fetchFromServer(
      courseId,
      (queryClient.getQueryData<T[]>([name, semesterId]) ?? []).filter(
        item => item.courseId === courseId,
      ),
    );

  const query = (semesterId: string) =>
    queryOptions({
      queryKey: [name, semesterId] as const,
      queryFn: async (): Promise<T[]> => {
        const courseIds = await courseIdsOf(semesterId);
        const results = await Promise.allSettled(
          courseIds.map(courseId =>
            courseFetches(() => fetchCourse(semesterId, courseId), priority),
          ),
        );
        const failure = results.find(r => r.status === 'rejected');
        if (failure && results.every(r => r.status === 'rejected')) {
          throw failure.reason;
        }
        // A course that failed keeps what was cached for it.
        const failed = new Set(
          courseIds.filter((_, i) => results[i].status === 'rejected'),
        );
        const cached =
          failed.size > 0
            ? (queryClient.getQueryData<T[]>([name, semesterId]) ?? [])
            : [];
        return sort(
          withOverrides([
            ...cached.filter(item => failed.has(item.courseId)),
            ...results.flatMap((result, i) =>
              result.status === 'fulfilled'
                ? tag<T>(courseIds[i], result.value)
                : [],
            ),
          ]),
        );
      },
    });

  /**
   * Replaces one course's items in the semester list and saves it. Every item
   * gets its per-item requests again, as the user asked for it (or it follows
   * a submission), so details changed in place show up too.
   */
  const refreshCourse = async (semesterId: string, courseId: string) => {
    const items = withOverrides(
      tag<T>(courseId, await fetchFromServer(courseId, [])),
    );
    const { queryKey } = query(semesterId);
    queryClient.setQueryData<T[]>(queryKey, old =>
      sort([...(old ?? []).filter(i => i.courseId !== courseId), ...items]),
    );
    await queryPersister.persistQueryByKey(queryKey, queryClient);
  };

  /**
   * Puts freshly fetched courses into the semester list, keeping the cached
   * items of the other courses, and saves it. Unless `complete`, the list
   * keeps its old fetch time, so the app still refetches it when it shows it.
   */
  const putCourses = async (
    semesterId: string,
    fetched: ReadonlyMap<string, object[]>,
    { complete }: { complete: boolean },
  ) => {
    const { queryKey } = query(semesterId);
    const cached = queryClient.getQueryData<T[]>(queryKey) ?? [];
    const items = sort(
      withOverrides([
        ...cached.filter(item => !fetched.has(item.courseId)),
        ...[...fetched].flatMap(([courseId, list]) => tag<T>(courseId, list)),
      ]),
    );
    queryClient.setQueryData<T[]>(queryKey, items, {
      updatedAt: complete
        ? Date.now()
        : (queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0),
    });
    await queryPersister.persistQueryByKey(queryKey, queryClient);
    return items;
  };

  /**
   * Changes one cached item of the semester being shown and saves the list,
   * e.g. to mark it read before the server says so. Later responses this
   * session keep the change.
   */
  const updateItem = (id: string, change: Partial<T>) => {
    overrides.set(id, { ...overrides.get(id), ...change });
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
    fetchCourse,
    putCourses,
    refreshCourse,
    updateItem,
    useList,
    useItem,
    useRefreshCourse,
  };
};

/**
 * A course's notices. The list only names a notice's attachment and fetching
 * it takes a request per notice, so only new or changed notices get it; the
 * others keep the one cached.
 */
const fetchNotices = async (courseId: string, cached: Notice[]) => {
  const known = new Map(cached.map(notice => [notice.id, notice]));
  const isUnchanged = (notice: Notification) => {
    const old = known.get(notice.id);
    return (
      !!old &&
      old.publishTime === notice.publishTime &&
      old.attachment?.name === notice.attachmentName
    );
  };
  const notices = await dataSource.getNotificationList(
    courseId,
    CourseType.STUDENT,
    { attachments: notice => !isUnchanged(notice) },
  );
  return notices.map(notice =>
    notice.attachmentName && !notice.attachment && isUnchanged(notice)
      ? { ...notice, attachment: known.get(notice.id)!.attachment }
      : notice,
  );
};

const notices = createContent<Notice>({
  name: 'notices',
  priority: 1,
  fetchCourse: fetchNotices,
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

/**
 * What the assignment list says about an assignment; its detail (description,
 * attachments, submission, answer) takes two more requests, so it's only
 * fetched for an assignment that is new or whose list entry changed.
 */
const listFields = [
  'title',
  'deadline',
  'lateSubmissionDeadline',
  'submitted',
  'submitTime',
  'isLateSubmission',
  'graded',
  'grade',
  'gradeLevel',
  'gradeTime',
  'graderName',
  'gradeContent',
] as const satisfies readonly (keyof Assignment & keyof Homework)[];

/** The fields of an assignment that come from its detail. */
const detailFields = [
  'description',
  'attachment',
  'answerContent',
  'answerAttachment',
  'submittedContent',
  'submittedAttachment',
  'gradeAttachment',
] as const satisfies readonly (keyof Assignment & keyof IHomeworkDetail)[];

const fetchAssignments = async (courseId: string, cached: Assignment[]) => {
  const known = new Map(cached.map(assignment => [assignment.id, assignment]));
  const isUnchanged = (homework: IHomework) => {
    const old = known.get(homework.id);
    return !!old && listFields.every(field => old[field] === homework[field]);
  };
  const homework = await dataSource.getHomeworkList(
    courseId,
    CourseType.STUDENT,
    { details: item => !isUnchanged(item) },
  );
  return homework.map(item => {
    if (!isUnchanged(item)) {
      return item;
    }
    const old = known.get(item.id)!;
    const detail = Object.fromEntries(
      detailFields.map(field => [field, old[field]]),
    );
    return { ...item, ...detail };
  });
};

const assignments = createContent<Assignment>({
  name: 'assignments',
  priority: 0,
  fetchCourse: fetchAssignments,
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
  priority: 2,
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

/**
 * An excellent homework's detail (its attachments). The assignment list leaves
 * it out, as it takes two requests each, so it's fetched when it's shown.
 */
export const useExcellentHomeworkDetail = (homework: ExcellentHomework) => {
  const loggedIn = useLoggedIn();
  const listed = !!(homework.gradeAttachment || homework.submittedAttachment);
  const { data } = useQuery({
    queryKey: ['excellentHomework', homework.id] as const,
    queryFn: () => dataSource.getExcellentHomeworkDetail(homework),
    // An excellent homework doesn't change once it's picked.
    staleTime: Infinity,
    enabled: loggedIn && !listed,
  });
  return listed ? homework : { ...homework, ...data };
};

/** Fetching the lists a course at a time, as background sync does. */
export const contentLists = {
  notices: {
    fetchCourse: notices.fetchCourse,
    putCourses: notices.putCourses,
  },
  assignments: {
    fetchCourse: assignments.fetchCourse,
    putCourses: assignments.putCourses,
  },
  files: { fetchCourse: files.fetchCourse, putCourses: files.putCourses },
};
