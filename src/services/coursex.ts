import { Course } from 'data/types/state';
import { getCredentials } from 'data/credentials';
import { isMockUser } from 'helpers/mock';
import { assertServerWritesAllowed } from 'helpers/serverWrites';

/**
 * Shares the courses with courseX. The server decides what it keeps (new
 * courses, updated schedules), so learnX needs no token. The upload carries
 * no cookies: courseX's page in the app (screens/CourseX) may have left some
 * for tsinghua.app, which would tie the upload to whoever browsed it. Does
 * nothing for the mock account: its made-up courses must never reach the
 * real courseX.
 */
export const uploadCourses = async (courses: Course[]) => {
  if (isMockUser(getCredentials()?.username)) {
    return;
  }
  assertServerWritesAllowed('Course information sharing');

  const res = await fetch('https://tsinghua.app/api/learnx/courses', {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 1,
      courses: courses.map(c => ({
        id: c.id,
        name: c.chineseName,
        englishName: c.englishName,
        teacherId: c.teacherNumber,
        teacherName: c.teacherName,
        number: c.courseNumber,
        index: c.courseIndex,
        semesterId: c.semesterId,
        timeAndLocation: c.timeAndLocation,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Request failed with status code ${res.status}`);
  }
};
