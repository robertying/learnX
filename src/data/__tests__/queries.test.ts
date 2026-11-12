import { createElement, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Language } from '@robertying/thu-learn-lib';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from 'data/auth';
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
  useCourseIds,
  useCourses,
  userQuery,
} from 'data/queries';
import { dataSource } from 'data/source';
import { resetUserData, useUserDataStore } from 'data/userData';
import * as i18n from 'helpers/i18n';

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
      name: 'Siyuan Chen',
      department: 'Department of Electronic Engineering',
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

describe('asking in the app language', () => {
  it('asks the server for Chinese names in Chinese', async () => {
    jest
      .spyOn(require('helpers/i18n') as typeof i18n, 'isLocaleChinese')
      .mockReturnValue(true);
    const setLanguage = jest.spyOn(dataSource, 'setLanguage');
    await queryClient.fetchQuery(userQuery);
    expect(setLanguage).toHaveBeenCalledWith(Language.ZH);
  });

  it("names courses in the app's language even when asking for it fails", async () => {
    jest
      .spyOn(require('helpers/i18n') as typeof i18n, 'isLocaleChinese')
      .mockReturnValue(false);
    jest.spyOn(dataSource, 'setLanguage').mockRejectedValue(new Error());
    // The server still answers in Chinese.
    jest
      .spyOn(dataSource, 'getCourseList')
      .mockResolvedValue(
        mockCourses.filter(c => c.semesterId === mockCurrentSemester) as never,
      );
    const courses = await queryClient.fetchQuery(
      coursesQuery(mockCurrentSemester),
    );
    expect(courses.map(c => c.name)).toEqual(courses.map(c => c.englishName));
  });

  it('reads a user the server has no details for as unnamed', async () => {
    jest.spyOn(dataSource, 'getUserInfo').mockResolvedValue(undefined as never);
    expect(await queryClient.fetchQuery(userQuery)).toEqual({
      name: null,
      department: null,
    });
  });
});

describe('course hooks', () => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  afterEach(async () => {
    await act(() => {
      useAuthStore.setState({ loggedIn: false });
      resetUserData();
    });
  });

  it('has no courses while logged out or before a semester is picked', async () => {
    useUserDataStore.setState({ currentSemester: mockCurrentSemester });
    const { result } = await renderHook(
      () => ({ courses: useCourses().courses, ids: useCourseIds() }),
      { wrapper },
    );
    expect(result.current).toEqual({ courses: [], ids: [] });

    await act(() => {
      useAuthStore.setState({ loggedIn: true });
      useUserDataStore.setState({ currentSemester: undefined });
    });
    const second = await renderHook(() => useCourses(), { wrapper });
    expect(second.result.current.fetchStatus).toBe('idle');
  });

  it("lists the shown semester's courses and their sorted ids", async () => {
    useAuthStore.setState({ loggedIn: true });
    useUserDataStore.setState({ currentSemester: mockCurrentSemester });
    const { result } = await renderHook(
      () => ({ courses: useCourses().courses, ids: useCourseIds() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.courses).not.toHaveLength(0));
    expect(result.current.ids).toEqual(
      result.current.courses.map(course => course.id).sort(),
    );
    expect(result.current.courses[0].semesterId).toBe(mockCurrentSemester);
  });

  it('skips a semester whose courses were never fetched', () => {
    queryClient
      .getQueryCache()
      .build(queryClient, { queryKey: coursesQuery('2020-2021-1').queryKey });
    expect(getCachedCourses()).toEqual([]);
  });
});
