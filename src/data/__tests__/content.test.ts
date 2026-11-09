import dayjs from 'dayjs';
import type { HomeworkListOptions } from '@robertying/thu-learn-lib';
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
      // Tests run in English, so courses come with their English names.
      expect(notice.courseName).toBe(course.englishName);
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
    expect(assignments[0].courseName).toBe(course.englishName);
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

describe('per-item details', () => {
  const refetch = <T>(query: { queryKey: readonly unknown[] }) =>
    queryClient.fetchQuery({ ...(query as any), staleTime: 0 }) as Promise<T>;

  it('fetches assignment details only for new or changed assignments', async () => {
    const query = assignmentsQuery(semesterId);
    const first = await queryClient.fetchQuery(query);
    const described = mockAssignments.filter(
      a => courseIds.has(a.courseId) && a.description,
    );
    for (const a of described) {
      expect(first.find(f => f.id === a.id)!.description).toBe(a.description);
    }

    const detail = jest.spyOn(mockSource, 'getHomeworkDetail');
    const list = jest.spyOn(mockSource, 'getHomeworkList');
    // One assignment changed on the server since the last fetch.
    const changed = described[0];
    queryClient.setQueryData(query.queryKey, old =>
      old!.map(a =>
        a.id === changed.id
          ? { ...a, submitted: !a.submitted, description: 'stale' }
          : a,
      ),
    );

    const second = await refetch<typeof first>(query);
    // Each course's selector, asked about that course's assignments.
    const calls = list.mock.calls as unknown as [
      string,
      unknown,
      HomeworkListOptions?,
    ][];
    const selected = calls.flatMap(([courseId, , options]) => {
      const select = options?.details;
      return mockAssignments.filter(
        a =>
          a.courseId === courseId &&
          typeof select === 'function' &&
          select(a as never),
      );
    });
    expect(selected.map(a => a.id)).toEqual([changed.id]);
    expect(detail).not.toHaveBeenCalled();
    // The unchanged ones keep their cached detail; the changed one is new.
    for (const a of described) {
      expect(second.find(f => f.id === a.id)!.description).toBe(a.description);
    }
  });

  it('fetches notice attachments only for new or changed notices', async () => {
    const query = noticesQuery(semesterId);
    const withAttachment = mockNotices.filter(
      n => courseIds.has(n.courseId) && n.attachment,
    );
    expect(withAttachment.length).toBeGreaterThan(0);
    const first = await queryClient.fetchQuery(query);
    for (const n of withAttachment) {
      expect(first.find(f => f.id === n.id)!.attachment).toEqual(n.attachment);
    }

    const list = jest.spyOn(mockSource, 'getNotificationList');
    const second = await refetch<typeof first>(query);
    const selected = list.mock.calls.flatMap(([courseId, , options]) => {
      const select = options?.attachments;
      return mockNotices.filter(
        n =>
          n.courseId === courseId &&
          typeof select === 'function' &&
          select({ ...n, attachmentName: n.attachment?.name } as never),
      );
    });
    expect(selected).toEqual([]);
    for (const n of withAttachment) {
      expect(second.find(f => f.id === n.id)!.attachment).toEqual(n.attachment);
    }
  });

  it('keeps zone-less server times as Beijing times, and a refetch sees them unchanged', async () => {
    // thu-learn-lib 5.x passes notice times on as the server writes them
    const asServer = (time: string) => {
      const beijing = new Date(dayjs(time).valueOf() + 8 * 3600 * 1000)
        .toISOString()
        .slice(0, 16);
      return beijing.replace('T', ' ');
    };
    const getNotificationList = mockSource.getNotificationList;
    const list = jest
      .spyOn(mockSource, 'getNotificationList')
      .mockImplementation((async (
        ...args: Parameters<typeof getNotificationList>
      ) =>
        (await getNotificationList(...args)).map(n => ({
          ...n,
          publishTime: asServer(n.publishTime),
        }))) as typeof getNotificationList);
    const query = noticesQuery(semesterId);
    const first = await queryClient.fetchQuery(query);
    for (const n of first) {
      expect(n.publishTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/,
      );
      const original = mockNotices.find(m => m.id === n.id)!;
      expect(dayjs(n.publishTime).valueOf()).toBe(
        dayjs(original.publishTime).second(0).millisecond(0).valueOf(),
      );
    }

    list.mockClear();
    await refetch<typeof first>(query);
    const selected = list.mock.calls.flatMap(([courseId, , options]) => {
      const select = options?.attachments;
      return mockNotices.filter(
        n =>
          n.courseId === courseId &&
          typeof select === 'function' &&
          select({
            ...n,
            publishTime: asServer(n.publishTime),
            attachmentName: n.attachment?.name,
          } as never),
      );
    });
    expect(selected).toEqual([]);
  });

  it("refreshing a course fetches every item's details again", async () => {
    const query = assignmentsQuery(semesterId);
    const assignments = await queryClient.fetchQuery(query);
    const courseId = assignments[0].courseId;
    queryClient.setQueryData(query.queryKey, old =>
      old!.map(a => ({ ...a, description: 'stale' })),
    );

    await refreshCourseAssignments(semesterId, courseId);

    const refreshed = queryClient.getQueryData(query.queryKey)!;
    for (const a of refreshed.filter(r => r.courseId === courseId)) {
      expect(a.description).toBe(
        mockAssignments.find(m => m.id === a.id)!.description,
      );
    }
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
