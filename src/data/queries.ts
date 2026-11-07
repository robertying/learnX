import { useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { CourseType, Language } from 'thu-learn-lib';
import { queryClient } from 'data/queryClient';
import { dataSource } from 'data/source';
import { useLoggedIn } from 'data/auth';
import { Course, User } from 'data/types/state';
import { useCurrentSemester } from 'data/userData';
import { isLocaleChinese } from 'helpers/i18n';

export const queryKeys = {
  semesters: ['semesters'] as const,
  latestSemester: ['latestSemester'] as const,
  user: ['user'] as const,
  coursesAll: ['courses'] as const,
  courses: (semesterId: string) => ['courses', semesterId] as const,
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

/** The school's current semester, which may not be the one being shown. */
export const latestSemesterQuery = queryOptions({
  queryKey: queryKeys.latestSemester,
  queryFn: async () => (await dataSource.getCurrentSemester()).id,
});

export const userQuery = queryOptions({
  queryKey: queryKeys.user,
  queryFn: async (): Promise<User> => {
    await setLanguage();
    const user = await dataSource.getUserInfo(CourseType.STUDENT);
    return {
      name: user?.name ?? null,
      department: user?.department?.replace('(未译)', '') ?? null,
    };
  },
});

export const coursesQuery = (semesterId: string) =>
  queryOptions({
    queryKey: queryKeys.courses(semesterId),
    queryFn: async (): Promise<Course[]> => {
      const lang = await setLanguage();
      const results = await dataSource.getCourseList(
        semesterId,
        CourseType.STUDENT,
        lang,
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

/** Ids of the semester's courses; a new array only when the set changes. */
export const useCourseIds = () => {
  const { courses } = useCourses();
  const key = courses
    .map(course => course.id)
    .sort()
    .join(',');
  return useMemo(() => (key ? key.split(',') : []), [key]);
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
