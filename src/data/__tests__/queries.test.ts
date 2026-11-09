import { mockCourses, mockCurrentSemester, mockSemesters } from 'data/mock';
import {
  defaultMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import { clearQueryCache, queryClient, queryPersister } from 'data/queryClient';
import {
  coursesQuery,
  getCachedCourses,
  getCourseNames,
  schoolSemesterQuery,
  semestersQuery,
  userQuery,
} from 'data/queries';

// The emulated server, as when a mock account is logged in.
jest.mock('data/source', () => ({
  dataSource: require('data/mockSource').mockSource,
}));

beforeEach(() => {
  setMockNetworkConfig({ ...defaultMockNetworkConfig, latency: 'none' });
  clearQueryCache();
});

describe('server queries', () => {
  it('lists semesters newest first', async () => {
    expect(await queryClient.fetchQuery(semestersQuery)).toEqual(
      [...mockSemesters].sort().reverse(),
    );
  });

  it("knows the school's current semester and its dates", async () => {
    const semester = await queryClient.fetchQuery(schoolSemesterQuery);
    expect(semester.id).toBe(mockCurrentSemester);
    expect(semester.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reads the user', async () => {
    expect(await queryClient.fetchQuery(userQuery)).toEqual({
      name: '陈思远',
      department: '电子工程系',
    });
  });

  it("tags a semester's courses with it and sorts them by id", async () => {
    const courses = await queryClient.fetchQuery(
      coursesQuery(mockCurrentSemester),
    );
    const expected = mockCourses.filter(
      c => c.semesterId === mockCurrentSemester,
    );
    expect(courses.map(c => c.id)).toEqual(
      expected.map(c => c.id).sort((a, b) => a.localeCompare(b)),
    );
    expect(courses.every(c => c.semesterId === mockCurrentSemester)).toBe(true);
  });

  it('names a course from the cache', async () => {
    await queryClient.fetchQuery(coursesQuery(mockCurrentSemester));
    const [course] = getCachedCourses();
    expect(getCourseNames(course.id)).toEqual({
      courseName: course.name,
      courseTeacherName: course.teacherName,
    });
    expect(getCourseNames('unknown')).toEqual({
      courseName: '',
      courseTeacherName: '',
    });
  });

  it('saves responses and restores them on the next launch', async () => {
    const courses = await queryClient.fetchQuery(
      coursesQuery(mockCurrentSemester),
    );
    // Responses are written once the fetch settles.
    await new Promise(resolve => setTimeout(resolve, 0));

    queryClient.clear();
    expect(getCachedCourses()).toEqual([]);

    await queryPersister.restoreQueries(queryClient);
    expect(
      queryClient.getQueryData(coursesQuery(mockCurrentSemester).queryKey),
    ).toEqual(courses);
  });

  it('forgets everything on logout', async () => {
    await queryClient.fetchQuery(coursesQuery(mockCurrentSemester));
    await new Promise(resolve => setTimeout(resolve, 0));
    clearQueryCache();
    await queryPersister.restoreQueries(queryClient);
    expect(getCachedCourses()).toEqual([]);
  });
});
