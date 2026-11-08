import dayjs from 'dayjs';
import {
  assignmentsQuery,
  filesQuery,
  markFileSeen,
  markNoticeRead,
  noticesQuery,
  refreshCourseAssignments,
  refreshCourseFiles,
  refreshCourseNotices,
} from 'data/content';
import {
  mockAssignments,
  mockCourses,
  mockCurrentSemester,
  mockFiles,
  mockNotices,
} from 'data/mock';
import {
  defaultMockNetworkConfig,
  mockSource,
  setMockNetworkConfig,
} from 'data/mockSource';
import { clearQueryCache, queryClient, queryPersister } from 'data/queryClient';
import { Notice } from 'data/types/state';
import { resetUserData, setCurrentSemester } from 'data/userData';
import { sortAssignments } from 'helpers/assignments';

// The emulated server, as when a mock account is logged in.
jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
}));

const semesterId = mockCurrentSemester;
const courseIds = new Set(
  mockCourses.filter(c => c.semesterId === semesterId).map(c => c.id),
);

const isNewestFirst = (notices: Notice[]) =>
  notices.every(
    (n, i) =>
      i === 0 ||
      dayjs(notices[i - 1].publishTime).unix() >= dayjs(n.publishTime).unix(),
  );

beforeEach(() => {
  jest.restoreAllMocks();
  setMockNetworkConfig({ ...defaultMockNetworkConfig, latency: 'none' });
  clearQueryCache();
});

describe('notices', () => {
  it("lists the semester's notices newest first, with their course", async () => {
    const notices = await queryClient.fetchQuery(noticesQuery(semesterId));
    const expected = mockNotices.filter(n => courseIds.has(n.courseId));
    expect(notices.map(n => n.id).sort()).toEqual(
      expected.map(n => n.id).sort(),
    );
    expect(isNewestFirst(notices)).toBe(true);
    for (const notice of notices) {
      const course = mockCourses.find(c => c.id === notice.courseId)!;
      expect(notice.courseName).toBe(course.name);
      expect(notice.courseTeacherName).toBe(course.teacherName);
    }
  });

  it("refreshes one course's notices and saves the list", async () => {
    const key = noticesQuery(semesterId).queryKey;
    const notices = await queryClient.fetchQuery(noticesQuery(semesterId));
    const courseId = notices[0].courseId;
    const others = notices.filter(n => n.courseId !== courseId);

    // The course's notices are gone from the list until it is refreshed.
    queryClient.setQueryData(key, others);
    await refreshCourseNotices(semesterId, courseId);

    const refreshed = queryClient.getQueryData(key)!;
    expect(refreshed.map(n => n.id).sort()).toEqual(
      notices.map(n => n.id).sort(),
    );
    expect(isNewestFirst(refreshed)).toBe(true);

    queryClient.clear();
    await queryPersister.restoreQueries(queryClient);
    expect(queryClient.getQueryData(key)).toEqual(refreshed);
  });
});

describe('assignments', () => {
  const ids = (items: { id: string }[]) => items.map(i => i.id);

  it("lists the semester's assignments in the app's order", async () => {
    const assignments = await queryClient.fetchQuery(
      assignmentsQuery(semesterId),
    );
    const expected = mockAssignments.filter(a => courseIds.has(a.courseId));
    expect(ids(assignments).sort()).toEqual(ids(expected).sort());
    expect(ids(assignments)).toEqual(ids(sortAssignments(assignments)));
    const course = mockCourses.find(c => c.id === assignments[0].courseId)!;
    expect(assignments[0].courseName).toBe(course.name);
  });

  it("refreshes one course's assignments and keeps the order", async () => {
    const key = assignmentsQuery(semesterId).queryKey;
    const assignments = await queryClient.fetchQuery(
      assignmentsQuery(semesterId),
    );
    const courseId = assignments[0].courseId;

    queryClient.setQueryData(
      key,
      assignments.filter(a => a.courseId !== courseId),
    );
    await refreshCourseAssignments(semesterId, courseId);

    const refreshed = queryClient.getQueryData(key)!;
    expect(ids(refreshed).sort()).toEqual(ids(assignments).sort());
    expect(ids(refreshed)).toEqual(ids(sortAssignments(refreshed)));
  });
});

describe('fetching course by course', () => {
  it('keeps the cached items of a course that fails', async () => {
    const key = noticesQuery(semesterId).queryKey;
    const notices = await queryClient.fetchQuery(noticesQuery(semesterId));
    const failing = notices[0].courseId;
    const kept = notices.filter(n => n.courseId === failing);
    const getNotificationList = mockSource.getNotificationList;
    jest
      .spyOn(mockSource, 'getNotificationList')
      .mockImplementation(((id: string) =>
        id === failing
          ? Promise.reject(new Error('server error'))
          : getNotificationList(id)) as typeof getNotificationList);

    const refetched = await queryClient.fetchQuery({
      ...noticesQuery(semesterId),
      staleTime: 0,
    });

    expect(refetched.map(n => n.id).sort()).toEqual(
      notices.map(n => n.id).sort(),
    );
    expect(refetched.filter(n => n.courseId === failing)).toEqual(kept);
    expect(isNewestFirst(queryClient.getQueryData(key)!)).toBe(true);
  });

  it('fails when every course fails', async () => {
    await queryClient.fetchQuery(filesQuery(semesterId));
    jest
      .spyOn(mockSource, 'getFileList')
      .mockRejectedValue(new Error('server error'));
    await expect(
      queryClient.fetchQuery({ ...filesQuery(semesterId), staleTime: 0 }),
    ).rejects.toThrow('server error');
  });
});

describe('files', () => {
  it("lists the semester's files newest first and refreshes one course", async () => {
    const key = filesQuery(semesterId).queryKey;
    const files = await queryClient.fetchQuery(filesQuery(semesterId));
    const expected = mockFiles.filter(f => courseIds.has(f.courseId));
    expect(files.map(f => f.id).sort()).toEqual(expected.map(f => f.id).sort());
    const newestFirst = files.every(
      (f, i) =>
        i === 0 ||
        dayjs(files[i - 1].uploadTime).unix() >= dayjs(f.uploadTime).unix(),
    );
    expect(newestFirst).toBe(true);

    const courseId = files[0].courseId;
    queryClient.setQueryData(
      key,
      files.filter(f => f.courseId !== courseId),
    );
    await refreshCourseFiles(semesterId, courseId);
    expect(queryClient.getQueryData(key)).toEqual(files);
  });
});

describe('marking items read', () => {
  beforeEach(() => {
    resetUserData();
    setCurrentSemester(semesterId);
  });

  it('marks a notice read in the cached list and saves it', async () => {
    const notices = await queryClient.fetchQuery(noticesQuery(semesterId));
    const unread = notices.find(n => !n.hasRead)!;
    const persist = jest.spyOn(queryPersister, 'persistQueryByKey');

    markNoticeRead(unread.id);

    const after = queryClient.getQueryData(noticesQuery(semesterId).queryKey)!;
    expect(after.find(n => n.id === unread.id)?.hasRead).toBe(true);
    expect(after.filter(n => n.id !== unread.id)).toEqual(
      notices.filter(n => n.id !== unread.id),
    );
    expect(persist).toHaveBeenCalledWith(
      noticesQuery(semesterId).queryKey,
      queryClient,
    );
    persist.mockRestore();
  });

  it('marks a file seen', async () => {
    const files = await queryClient.fetchQuery(filesQuery(semesterId));
    const file = files.find(f => f.isNew) ?? files[0];
    markFileSeen(file.id);
    const after = queryClient.getQueryData(filesQuery(semesterId).queryKey)!;
    expect(after.find(f => f.id === file.id)?.isNew).toBe(false);
  });

  it('keeps the change when a fetch already under way lands', async () => {
    const files = await queryClient.fetchQuery(filesQuery(semesterId));
    const file = files.find(f => f.isNew)!;
    setMockNetworkConfig({ latency: 'normal' });

    const refetch = queryClient.fetchQuery({
      ...filesQuery(semesterId),
      staleTime: 0,
    });
    markFileSeen(file.id);
    const fetched = await refetch;

    expect(fetched.find(f => f.id === file.id)?.isNew).toBe(false);
    const after = queryClient.getQueryData(filesQuery(semesterId).queryKey)!;
    expect(after.find(f => f.id === file.id)?.isNew).toBe(false);
  });

  it('does nothing for an item that is not cached', () => {
    markNoticeRead('missing');
    expect(
      queryClient.getQueryData(noticesQuery(semesterId).queryKey),
    ).toBeUndefined();
  });
});
