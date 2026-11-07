import {
  ApiError,
  ContentType,
  CourseContent,
  FailReason,
  SemesterInfo,
  SemesterType,
} from 'thu-learn-lib';
import type { DataSource } from 'data/source';
import type { PersistAppState } from 'data/types/state';

/**
 * Stands in for learn.tsinghua.edu.cn when a mock account is logged in.
 *
 * Every call answers with the data in `data/mock.ts` after a network-like
 * delay, and can be made to fail the way the real server and network do, so
 * refreshes, spinners, errors and the re-login flow can be exercised without a
 * real account. Dev builds change the behavior from Settings › Network
 * emulation (`screens/MockNetwork.tsx`).
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

const apiError = (reason: FailReason): ApiError => ({ reason });

/** Waits like a round trip, then throws if a failure is switched on. */
const roundTrip = async ({ isLogin = false } = {}) => {
  switch (config.failure) {
    case 'offline':
      // No connection fails before the request leaves the device.
      await wait(Math.min(randomLatency(), 300));
      throw new TypeError('Network request failed');
    case 'timeout':
      await wait(MOCK_TIMEOUT_MS);
      throw new TypeError('Network request timed out');
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

const mockData = (): PersistAppState => require('data/mock').default;

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

const itemsOf = (type: ContentType) => {
  const data = mockData();
  switch (type) {
    case ContentType.NOTIFICATION:
      return data.notices.items;
    case ContentType.HOMEWORK:
      return data.assignments.items;
    case ContentType.FILE:
      return data.files.items;
    default:
      return [];
  }
};

const semesterInfo = (id: string): SemesterInfo => {
  const [startYear, endYear, term] = id.split('-');
  return {
    id,
    startDate: '',
    endDate: '',
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

// The mock data holds the app's slimmer state types, not the library's full
// types, so results are cast at this one boundary.
export const mockSource: DataSource = {
  login: () => roundTrip({ isLogin: true }),
  // Not awaited by callers; never fails.
  logout: () => Promise.resolve(),
  getCSRFToken: () => 'mock-csrf-token',
  setLanguage: () => request(() => undefined),
  getUserInfo: () => request(() => mockData().user as any),
  getSemesterIdList: () => request(() => mockData().semesters.items),
  getCurrentSemester: () =>
    request(() => semesterInfo(mockData().semesters.current!)),
  getCourseList: semesterId =>
    request(
      () =>
        mockData()
          .courses.items.filter(course => course.semesterId === semesterId)
          .map(course => omit(course, ['semesterId'])) as any,
    ),
  getNotificationList: courseId =>
    request(
      () =>
        groupByCourse(mockData().notices.items, [courseId])[courseId] as any,
    ),
  getHomeworkList: courseId =>
    request(
      () =>
        groupByCourse(mockData().assignments.items, [courseId])[
          courseId
        ] as any,
    ),
  getFileList: courseId =>
    request(
      () => groupByCourse(mockData().files.items, [courseId])[courseId] as any,
    ),
  getAllContents: <T extends ContentType>(courseIds: string[], type: T) =>
    request(
      () =>
        groupByCourse<{ courseId: string }>(
          itemsOf(type),
          courseIds,
        ) as unknown as CourseContent<T>,
    ),
  // The mock courses have no timetable.
  getCalendar: () => request(() => []),
};

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
