import {
  ApiError,
  CalendarResult,
  ContentType,
  DetailSelector,
  FailReason,
  Language,
  SemesterInfo,
  SemesterType,
} from '@robertying/thu-learn-lib';
import dayjs from 'dayjs';
import { favoriteContentTypes } from 'data/pendingActions';
import type { AppSource } from 'data/source';
import { sessionsFromCourses } from 'helpers/schedule';
import { beijingClock, beijingDate } from 'helpers/serverTime';

const mock = (): typeof import('data/mock') => require('data/mock');

/**
 * Stands in for learn.tsinghua.edu.cn when a mock account is logged in.
 *
 * Every call answers with the data in `data/mock.ts` after a network-like
 * delay, and can be made to fail the way the real server and network do, so
 * refreshes, spinners, errors and the re-login flow can be exercised without a
 * real account. Dev builds change the behavior from Settings › Network
 * emulation (`screens/MockNetwork.tsx`), which also applies to file downloads
 * (`helpers/fs.ts`).
 */

export type MockLatency = 'none' | 'normal' | 'slow';

export type MockFailure =
  /** Every request succeeds. */
  | 'none'
  /** Requests fail fast, like a device without a connection. */
  | 'offline'
  /** The server answers with an unexpected status. */
  | 'serverError'
  /** Requests hang, then fail like a timed-out fetch. */
  | 'timeout';

export interface MockNetworkConfig {
  latency: MockLatency;
  /** Applies to every request, login included. */
  failure: MockFailure;
  /** Logins are rejected as if the password had changed. */
  loginFails: boolean;
}

export const defaultMockNetworkConfig: MockNetworkConfig = {
  latency: 'normal',
  failure: 'none',
  loginFails: false,
};

/** Ranges in ms; a request takes a random time in its range. */
const latencyRanges: Record<MockLatency, [number, number]> = {
  none: [0, 0],
  normal: [300, 1200],
  slow: [3000, 6000],
};

export const MOCK_TIMEOUT_MS = 20 * 1000;

let config = defaultMockNetworkConfig;
const listeners = new Set<() => void>();

export const getMockNetworkConfig = () => config;

export const setMockNetworkConfig = (change: Partial<MockNetworkConfig>) => {
  config = { ...config, ...change };
  listeners.forEach(listener => listener());
};

export const subscribeMockNetworkConfig = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const wait = (ms: number) =>
  ms > 0
    ? new Promise<void>(resolve => setTimeout(resolve, ms))
    : Promise.resolve();

const randomLatency = () => {
  const [min, max] = latencyRanges[config.latency];
  return min + Math.random() * (max - min);
};

const apiError = (reason: FailReason, extra?: unknown): ApiError => ({
  reason,
  extra,
});

/**
 * Waits like a round trip, then throws if a failure is switched on, with the
 * errors thu-learn-lib gives.
 */
const roundTrip = async ({ isLogin = false } = {}) => {
  switch (config.failure) {
    case 'offline':
      // No connection fails before the request leaves the device.
      await wait(Math.min(randomLatency(), 300));
      throw apiError(
        FailReason.NETWORK_ERROR,
        new TypeError('Network request failed'),
      );
    case 'timeout':
      await wait(MOCK_TIMEOUT_MS);
      throw apiError(FailReason.REQUEST_TIMEOUT);
    case 'serverError':
      await wait(randomLatency());
      throw apiError(
        isLogin ? FailReason.ERROR_FETCH_FROM_ID : FailReason.UNEXPECTED_STATUS,
      );
    case 'none':
      await wait(randomLatency());
  }
  if (isLogin && config.loginFails) {
    throw apiError(FailReason.BAD_CREDENTIAL);
  }
};

const request = async <T>(getResult: () => T): Promise<T> => {
  await roundTrip();
  // A fresh copy for every response, as if parsed off the wire.
  const result = getResult();
  return result === undefined ? result : JSON.parse(JSON.stringify(result));
};

const omit = (item: object, keys: string[]) => {
  const copy = { ...item } as Record<string, unknown>;
  keys.forEach(key => delete copy[key]);
  return copy;
};

/** Drops the fields the app adds after fetching, to answer like the server. */
const stripCourseFields = (item: object) =>
  omit(item, ['courseId', 'courseName', 'courseTeacherName']);

const groupByCourse = <T extends { courseId: string }>(
  items: T[],
  courseIds: string[],
) =>
  Object.fromEntries(
    courseIds.map(id => [
      id,
      items.filter(item => item.courseId === id).map(stripCourseFields),
    ]),
  );

const isSelected = <T>(selector: DetailSelector<T> | undefined, item: T) =>
  selector === 'all' || (typeof selector === 'function' && selector(item));

/** The fields of an assignment the list leaves out, as the server does. */
const homeworkDetailFields = [
  'description',
  'attachment',
  'answerContent',
  'answerAttachment',
  'submittedContent',
  'submittedAttachment',
  'gradeAttachment',
];

const pick = (item: object, keys: string[]) =>
  Object.fromEntries(
    Object.entries(item).filter(([key]) => keys.includes(key)),
  );

/**
 * A notice as the list has it: the attachment only by name, unless
 * `attachments` selects the notice.
 */
const listedNotice = (
  notice: object,
  attachments: DetailSelector<any> | undefined,
) => {
  const { attachment, ...rest } = notice as { attachment?: { name: string } };
  const listed = attachment
    ? { ...rest, attachmentName: attachment.name }
    : rest;
  return attachment && isSelected(attachments, listed)
    ? { ...listed, attachment }
    : listed;
};

/**
 * An assignment as the list has it: without its detail unless `details`
 * selects it, and with its excellent homework never detailed.
 */
const listedAssignment = (
  assignment: object,
  details: DetailSelector<any> | undefined,
) => {
  const { excellentHomeworkList, ...rest } = assignment as {
    id: string;
    excellentHomeworkList?: object[];
  };
  const listed = {
    ...omit(rest, homeworkDetailFields),
    baseId: rest.id,
    ...(excellentHomeworkList && {
      excellentHomeworkList: excellentHomeworkList.map(item =>
        omit(item, homeworkDetailFields),
      ),
    }),
  };
  return isSelected(details, listed)
    ? { ...listed, ...pick(rest, homeworkDetailFields) }
    : listed;
};

/** A YYYYMMDD date, as the calendar takes it. */
const parseDay = (day: string) =>
  dayjs(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`);

const semesterInfo = (id: string): SemesterInfo => {
  const [startYear, endYear, term] = id.split('-');
  return {
    id,
    ...(id === mock().mockCurrentSemester
      ? {
          startDate: mock().mockSemesterStart.format('YYYY-MM-DD'),
          endDate: mock()
            .mockSemesterStart.add(18, 'week')
            .format('YYYY-MM-DD'),
        }
      : { startDate: '', endDate: '' }),
    startYear: Number(startYear),
    endYear: Number(endYear),
    type:
      term === '1'
        ? SemesterType.FALL
        : term === '2'
          ? SemesterType.SPRING
          : SemesterType.SUMMER,
  };
};

/**
 * The emulated account's favorites, by item id: seeded from `mockFavorites`
 * and changed by add and remove. Kept in memory, so they start over when the
 * JS reloads, as the rest of the emulated server does.
 */
let favorites: Map<string, ContentType> | undefined;
const mockFavoriteIds = () =>
  (favorites ??= new Map(
    (
      Object.keys(favoriteContentTypes) as (keyof typeof favoriteContentTypes)[]
    ).flatMap(type =>
      mock().mockFavorites[type].map(
        id => [id, favoriteContentTypes[type]] as const,
      ),
    ),
  ));

/** The mock items that can be favorited, with their type. */
const favoritable = () => [
  ...mock().mockNotices.map(item => ({
    item,
    type: ContentType.NOTIFICATION,
  })),
  ...mock().mockAssignments.map(item => ({
    item,
    type: ContentType.HOMEWORK,
  })),
  ...mock().mockFiles.map(item => ({
    item,
    type: ContentType.FILE,
  })),
];

const withFavorite = <T extends { id: string }>(item: T) => ({
  ...item,
  isFavorite: mockFavoriteIds().has(item.id),
});

// The mock data holds the app's slimmer state types, not the library's full
// types, so results are cast at this one boundary.
export const mockSource: AppSource = {
  login: () => roundTrip({ isLogin: true }),
  // The emulated session never expires: one request either way.
  ensureSession: () => roundTrip(),
  // Not awaited by callers; never fails.
  logout: () => Promise.resolve(),
  getCSRFToken: () => 'mock-csrf-token',
  setLanguage: () => request(() => undefined),
  getUserInfo: () => request(() => mock().mockUser as any),
  getSemesterIdList: () => request(() => mock().mockSemesters),
  getCurrentSemester: () =>
    request(() => semesterInfo(mock().mockCurrentSemester)),
  // Names come in the language asked for, as the server does.
  getCourseList: (semesterId, _courseType, lang, options) =>
    request(
      () =>
        mock()
          .mockCourses.filter(course => course.semesterId === semesterId)
          .map(course =>
            omit(
              lang === Language.EN
                ? { ...course, name: course.englishName }
                : course,
              options?.timeAndLocation
                ? ['semesterId']
                : ['semesterId', 'timeAndLocation'],
            ),
          ) as any,
    ),
  getNotificationList: (courseId, _courseType, options) =>
    request(
      () =>
        groupByCourse(mock().mockNotices, [courseId])[courseId].map(notice =>
          listedNotice(
            withFavorite(notice as { id: string }),
            options?.attachments,
          ),
        ) as any,
    ),
  getHomeworkList: ((courseId: string, _courseType?: unknown, options?: any) =>
    request(
      () =>
        groupByCourse(mock().mockAssignments, [courseId])[courseId].map(
          assignment =>
            listedAssignment(
              withFavorite(assignment as { id: string }),
              options?.details,
            ),
        ) as any,
    )) as AppSource['getHomeworkList'],
  // The app passes the whole item; the mock tells them apart by id.
  getExcellentHomeworkDetail: homework =>
    request(() =>
      pick(
        mock()
          .mockAssignments.flatMap(
            assignment => assignment.excellentHomeworkList ?? [],
          )
          .find(item => item.id === (homework as { id?: string }).id) ?? {},
        homeworkDetailFields,
      ),
    ),
  // Like thu-learn-lib's, the list has `isFavorite` only when asked for.
  getFileList: (courseId, _courseType, options) =>
    request(
      () =>
        groupByCourse(mock().mockFiles, [courseId])[courseId].map(file =>
          options?.favorites
            ? withFavorite(file as { id: string })
            : omit(file, ['isFavorite']),
        ) as any,
    ),
  // An id the server doesn't know answers HTTP 500; adding twice keeps one.
  addToFavorites: (type, id) =>
    request(() => {
      if (!favoritable().some(f => f.type === type && f.item.id === id)) {
        throw apiError(FailReason.UNEXPECTED_STATUS);
      }
      mockFavoriteIds().set(id, type);
    }),
  // Removing an item that isn't a favorite succeeds.
  removeFromFavorites: id =>
    request(() => {
      mockFavoriteIds().delete(id);
    }),
  // The registrar's calendar, worked out from the courses' times.
  getCalendar: (start, end) =>
    request((): CalendarResult => {
      const from = parseDay(start);
      const days = parseDay(end).diff(from, 'day') + 1;
      const events = sessionsFromCourses(
        mock().mockCourses.filter(
          course => course.semesterId === mock().mockCurrentSemester,
        ),
        mock().mockSemesterStart.format('YYYY-MM-DD'),
        from,
        days,
      ).map(session => ({
        courseName: session.courseName,
        location: session.location,
        status: '',
        // the registrar writes Beijing dates and times
        date: beijingDate(session.start),
        startTime: beijingClock(session.start),
        endTime: beijingClock(session.end),
      }));
      return { events, failedRanges: [] };
    }),
  // The requests the app sends itself.
  markNoticeRead: () => mockMarkNoticeRead(),
  submitAssignment: (_id, { onProgress }) => mockSubmitAssignment(onProgress),
  prepareFileDownload: () => mockDownloadFile(),
};

/**
 * Emulates the file server's round trip before a download starts: waits like
 * the time to the first byte, then fails if a failure is switched on. The
 * bytes still come from the mock file's real URL afterwards, so the file can
 * be shown.
 */
export const mockDownloadFile = () => roundTrip();

/** Emulates loading a notice's page, which marks it read. */
export const mockMarkNoticeRead = () => roundTrip();

/** Emulates the assignment upload, reporting progress along the way. */
export const mockSubmitAssignment = async (
  onProgress?: (progress: number) => void,
) => {
  // Upload first, then wait for the server's answer.
  const steps = 4;
  const uploadTime = randomLatency();
  for (let step = 1; step <= steps; step++) {
    await wait(uploadTime / steps);
    onProgress?.(step / steps);
  }
  await roundTrip();
};
