import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import {
  CourseType,
  type ExcellentHomework,
  type Homework,
  type CourseNotificationBase,
  type HomeworkBase,
  type HomeworkDetail,
} from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import { queryClient, queryPersister, saveQuerySoon } from 'data/queryClient';
import { coursesQuery, getCourseNames } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { dataSource } from 'data/source';
import { Assignment, File, Notice } from 'data/types/state';
import { getUserData, useCurrentSemester, useUserData } from 'data/userData';
import { type ContentListName, localChanges } from 'data/pendingActions';
import { sortAssignments } from 'helpers/assignments';
import { createLimiter } from 'helpers/limiter';
import { sameServerTime } from 'helpers/serverTime';

/**
 * Course lists fetched at once, across notices, assignments and files. A
 * course's assignments take a few requests plus two per new or changed
 * assignment, so a few courses keep the connections busy, and the server
 * isn't hit with every course of every list at the same moment.
 */
const courseFetches = createLimiter(4);

const assignmentTimes = [
  'deadline',
  'lateSubmissionDeadline',
  'submitTime',
  'gradeTime',
] as const;

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
  name: ContentListName;
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
  /**
   * Lays over a response fetched since `startedAt` (ms) what the user changed
   * in the app: the session's overrides, then the server actions still
   * waiting or taken since the fetch started (`data/pendingActions`).
   */
  const withOverrides = (items: T[], startedAt: number) => {
    const pending = localChanges(name, getUserData().pendingActions, startedAt);
    return overrides.size === 0 && pending.size === 0
      ? items
      : items.map(item => {
          const change = overrides.get(item.id);
          const local = pending.get(item.id);
          return change || local ? { ...item, ...change, ...local } : item;
        });
  };

  /** Fetches a course's items, reusing what the semester list has cached. */
  const fetchCourse = (semesterId: string, courseId: string) =>
    fetchFromServer(
      courseId,
      (queryClient.getQueryData<T[]>([name, semesterId]) ?? []).filter(
        item => item.courseId === courseId,
      ),
    );

  /**
   * Fetches these courses' items through the limiter shared by every list,
   * the screens' refreshes and the background sync alike. With a `deadline`
   * (a `Date.now()` time), courses not started by then aren't fetched, and
   * it resolves at the deadline at the latest; a course still running is
   * left out of `fetched` and `failed` and counts as timed out.
   */
  const fetchCourses = async (
    semesterId: string,
    courseIds: readonly string[],
    { deadline }: { deadline?: number } = {},
  ) => {
    const fetched = new Map<string, object[]>();
    const failed = new Map<string, unknown>();
    let done = false;
    const late = () => deadline !== undefined && Date.now() >= deadline;
    const runs = courseIds.map(courseId =>
      courseFetches(async () => {
        if (late()) {
          return;
        }
        try {
          const items = await fetchCourse(semesterId, courseId);
          if (!done) {
            fetched.set(courseId, items);
          }
        } catch (error) {
          if (!done) {
            failed.set(courseId, error);
          }
        }
      }, priority),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.all(runs),
      ...(deadline === undefined
        ? []
        : [
            new Promise<void>(resolve => {
              timer = setTimeout(resolve, Math.max(0, deadline - Date.now()));
            }),
          ]),
    ]);
    clearTimeout(timer);
    done = true;
    return {
      fetched,
      failed,
      timedOut: fetched.size + failed.size < courseIds.length,
    };
  };

  const query = (semesterId: string) =>
    queryOptions({
      queryKey: [name, semesterId] as const,
      queryFn: async (): Promise<T[]> => {
        const startedAt = Date.now();
        const courseIds = await courseIdsOf(semesterId);
        const { fetched, failed } = await fetchCourses(semesterId, courseIds);
        if (fetched.size === 0 && failed.size > 0) {
          throw failed.values().next().value;
        }
        // A course that failed keeps what was cached for it; a course no
        // longer listed goes.
        return merge(semesterId, fetched, startedAt, courseId =>
          failed.has(courseId),
        );
      },
    });

  /**
   * The semester's list with `fetched` courses' items in place of the cached
   * ones, keeping the cached items of the courses `keep` names.
   */
  const merge = (
    semesterId: string,
    fetched: ReadonlyMap<string, object[]>,
    startedAt: number,
    keep: (courseId: string) => boolean,
  ) => {
    const cached = queryClient.getQueryData<T[]>([name, semesterId]) ?? [];
    return sort(
      withOverrides(
        [
          ...cached.filter(
            item => !fetched.has(item.courseId) && keep(item.courseId),
          ),
          ...[...fetched].flatMap(([courseId, list]) => tag<T>(courseId, list)),
        ],
        startedAt,
      ),
    );
  };

  /**
   * Replaces one course's items in the semester list and saves it. Every item
   * gets its per-item requests again, as the user asked for it (or it follows
   * a submission), so details changed in place show up too.
   */
  const refreshCourse = async (semesterId: string, courseId: string) => {
    const startedAt = Date.now();
    const items = withOverrides(
      tag<T>(courseId, await fetchFromServer(courseId, [])),
      startedAt,
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
   * `startedAt` is when the fetches started (ms).
   */
  const putCourses = async (
    semesterId: string,
    fetched: ReadonlyMap<string, object[]>,
    { complete, startedAt }: { complete: boolean; startedAt: number },
  ) => {
    const { queryKey } = query(semesterId);
    const items = merge(semesterId, fetched, startedAt, () => true);
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
   * e.g. to mark it read before the server says so. Unless `keep` is false,
   * later responses this session keep the change.
   */
  const updateItem = (
    id: string,
    change: Partial<T>,
    { keep = true }: { keep?: boolean } = {},
  ) => {
    if (keep) {
      overrides.set(id, { ...overrides.get(id), ...change });
    }
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
    saveQuerySoon(queryKey);
  };

  const empty: T[] = [];

  /**
   * The items of the semester being shown, with the server actions still
   * waiting laid over them, so the cache read at launch (or changed by a
   * notification action while the app wasn't running) shows them too.
   */
  const useList = () => {
    const loggedIn = useLoggedIn();
    const semesterId = useCurrentSemester();
    const pendingActions = useUserData(data => data.pendingActions);
    const result = useQuery({
      ...query(semesterId ?? ''),
      enabled: loggedIn && !!semesterId,
    });
    const data = result.data ?? empty;
    const pending = localChanges(name, pendingActions, Infinity);
    const items =
      pending.size === 0
        ? data
        : data.map(item => {
            const change = pending.get(item.id);
            return change ? { ...item, ...change } : item;
          });
    return { ...result, items };
  };

  /**
   * The item with `id`, from the semester being shown or else from another
   * semester's cached list, so a detail screen left open keeps showing its item
   * after the semester is switched.
   */
  const useItem = (id: string) =>
    useList().items.find(item => item.id === id) ??
    queryClient
      .getQueriesData<T[]>({ queryKey: [name] })
      .flatMap(([, items]) => items ?? [])
      .find(item => item.id === id);

  /** Refreshes one course's items; `isPending` while it runs. */
  const useRefreshCourse = (courseId: string) => {
    const semesterId = useCurrentSemester();
    return useMutation({
      mutationFn: () => refreshCourse(semesterId!, courseId),
    });
  };

  return {
    query,
    fetchCourses,
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
  const isUnchanged = (notice: CourseNotificationBase) => {
    const old = known.get(notice.id);
    return (
      !!old &&
      sameServerTime(old.publishTime, notice.publishTime) &&
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
] as const satisfies readonly (keyof Assignment & keyof HomeworkDetail)[];

const fetchAssignments = async (courseId: string, cached: Assignment[]) => {
  const known = new Map(cached.map(assignment => [assignment.id, assignment]));
  const isUnchanged = (homework: HomeworkBase) => {
    const old = known.get(homework.id);
    return (
      !!old &&
      listFields.every(field =>
        (assignmentTimes as readonly string[]).includes(field)
          ? sameServerTime(
              old[field] as string | undefined,
              homework[field] as string | undefined,
            )
          : old[field] === homework[field],
      )
    );
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

/**
 * A course's files, with `isFavorite` filled in by thu-learn-lib from the
 * course's file favorites (the file list has no such field). If those fail,
 * so does the course, which keeps what was cached.
 */
const fetchFiles = (courseId: string) =>
  dataSource.getFileList(courseId, CourseType.STUDENT, { favorites: true });

const files = createContent<File>({
  name: 'files',
  priority: 2,
  fetchCourse: fetchFiles,
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

/** Shows an item's favorite in the cached list before the server has it. */
export const showFavorite = (
  list: ContentListName,
  id: string,
  isFavorite: boolean,
) => {
  // Not kept as an override: the pending action covers responses until the
  // server has it, and after that the server's answer counts.
  const change = { isFavorite };
  ({ notices, assignments, files })[list].updateItem(id, change, {
    keep: false,
  });
};

/**
 * Fetching some of a list's courses and saving them into it, as the
 * background sync does; the same fetches the screens' refreshes run.
 */
export const contentLists = {
  notices: {
    fetchCourses: notices.fetchCourses,
    putCourses: notices.putCourses,
  },
  assignments: {
    fetchCourses: assignments.fetchCourses,
    putCourses: assignments.putCourses,
  },
  files: { fetchCourses: files.fetchCourses, putCourses: files.putCourses },
};
