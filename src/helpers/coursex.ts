import axios from 'axios';
import { gql, GraphQLClient } from 'graphql-request';
import { Course } from 'data/types/state';
import env from './env';

const graphQLClient = new GraphQLClient('https://api.tsinghua.app/v1/graphql');

export const uploadCourses = async (courses: Course[]) => {
  const response = await axios.post('https://tsinghua.app/api/auth/session', {
    refreshToken: env.COURSEX_REFRESH_TOKEN,
  });

  const accessToken = response.data.accessToken;

  if (!accessToken) {
    return;
  }

  const coursesToUpload = courses.map(c => ({
    id: c.id,
    name: c.chineseName,
    teacher: {
      data: { id: c.teacherNumber, name: c.teacherName },
      on_conflict: { constraint: 'teacher_pkey', update_columns: ['name'] },
    },
    time_location: JSON.stringify(c.timeAndLocation),
    semester_id: c.semesterId,
    number: c.courseNumber,
    index: c.courseIndex,
    englishName: c.englishName,
  }));

  await graphQLClient.request(
    gql`
      mutation AddCourses($objects: [course_insert_input!]!) {
        insert_course(
          objects: $objects
          on_conflict: {
            constraint: course_pkey
            update_columns: [time_location, name, englishName]
          }
        ) {
          affected_rows
        }
      }
    `,
    {
      objects: coursesToUpload,
    },
    {
      Authorization: 'Bearer ' + accessToken,
    },
  );
};
