import { queryOptions, useQuery } from '@tanstack/react-query';
import { CourseType, Language } from '@robertying/thu-learn-lib';
import { queryClient } from 'data/queryClient';
import { dataSource } from 'data/source';
import { useLoggedIn } from 'data/auth';
import { Course, User } from 'data/types/state';
import { useCurrentSemester } from 'data/userData';
import { isLocaleChinese } from 'helpers/i18n';
import type { ContentListName } from 'data/pendingActions';

export const queryKeys = {
  semesters: ['semesters'] as const,
  // Its key from when only the timetable asked for the dates.
  schoolSemester: ['semesterDates'] as const,
  user: ['user'] as const,
  coursesAll: ['courses'] as const,
  courses: (semesterId: string) => ['courses', semesterId] as const,
  /** Every semester's list of notices, assignments or files. */
  contentAll: (list: ContentListName) => [list] as const,
  /** A semester's notices, assignments or files (`data/content`). */
  content: (list: ContentListName, semesterId: string) =>
    [list, semesterId] as const,
  excellentHomework: (id: string) => ['excellentHomework', id] as const,
};

/** Asks for names in the app's language; the answer doesn't matter. */
const setLanguage = async () => {
  const lang = isLocaleChinese() ? Language.ZH : Language.EN;
  try {
    await dataSource.setLanguage(lang);
  } catch {}
  return lang;
};

export const semestersQuery = queryOptions({
  queryKey: queryKeys.semesters,
  queryFn: async () => (await dataSource.getSemesterIdList()).sort().reverse(),
});

/** A semester with its first and last day. */
export interface SemesterDates {
  id: string;
  /** As the server gives it, e.g. 2026-09-14; may be empty. */
  startDate: string;
  endDate: string;
}

/**
 * The school's current semester, which may not be the one being shown, with
 * its first and last day. One query for the semester check at launch, the
 * semester list and the timetable's teaching weeks.
 */
export const schoolSemesterQuery = queryOptions({
  queryKey: queryKeys.schoolSemester,
  queryFn: async (): Promise<SemesterDates> => {
    const { id, startDate, endDate } = await dataSource.getCurrentSemester();
    return { id, startDate, endDate };
  },
});

/** Picks the id out of `schoolSemesterQuery`'s data. */
export const selectSemesterId = (semester: SemesterDates) => semester.id;

export const userQuery = queryOptions({
  queryKey: queryKeys.user,
  queryFn: async (): Promise<User> => {
    await setLanguage();
    const user = await dataSource.getUserInfo(CourseType.STUDENT);
    return {
      name: user?.name ?? null,
      // The server marks untranslated departments in English mode
      // oxlint-disable-next-line learnx/no-han-outside-translations --server text
      department: user?.department?.replace('(未译)', '') ?? null,
    };
  },
});

export const coursesQuery = (semesterId: string) =>
  queryOptions({
    queryKey: queryKeys.courses(semesterId),
    // Courses rarely change during a term, and each fetch also asks for every
    // course's time and location; pull to refresh on Courses still refetches.
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Course[]> => {
      const lang = await setLanguage();
      // Course sharing and the timetable use each course's time and location.
      const results = await dataSource.getCourseList(
        semesterId,
        CourseType.STUDENT,
        lang,
        { timeAndLocation: true },
      );
      return results
        .map(course => ({ ...course, semesterId }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  });

const noCourses: Course[] = [];

/** The courses of the semester being shown. */
export const useCourses = () => {
  const loggedIn = useLoggedIn();
  const semesterId = useCurrentSemester();
  const query = useQuery({
    ...coursesQuery(semesterId ?? ''),
    enabled: loggedIn && !!semesterId,
  });
  return { ...query, courses: query.data ?? noCourses };
};

/**
 * Ids of the semester's courses, sorted. A new array only when the set changes:
 * the React Compiler memoizes the split on the joined key, so effects can
 * depend on it.
 */
export const useCourseIds = () => {
  const { courses } = useCourses();
  const key = courses
    .map(course => course.id)
    .sort()
    .join(',');
  return key ? key.split(',') : [];
};

export const useCourse = (courseId: string) =>
  useCourses().courses.find(course => course.id === courseId);

/** Every course fetched so far, of any semester. */
export const getCachedCourses = () =>
  queryClient
    .getQueriesData<Course[]>({ queryKey: queryKeys.coursesAll })
    .flatMap(([, courses]) => courses ?? []);

/** The name and teacher shown next to a course's notices, assignments, files. */
export const getCourseNames = (courseId: string) => {
  const course = getCachedCourses().find(c => c.id === courseId);
  return {
    courseName: course?.name ?? '',
    courseTeacherName: course?.teacherName ?? '',
  };
};
