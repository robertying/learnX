import dayjs from 'dayjs';
import { noticesQuery, refreshCourseNotices } from 'data/content';
import { mockCourses, mockCurrentSemester, mockNotices } from 'data/mock';
import {
  defaultMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import { clearQueryCache, queryClient, queryPersister } from 'data/queryClient';
import { Notice } from 'data/types/state';

jest.mock('data/store', () => ({}));
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
