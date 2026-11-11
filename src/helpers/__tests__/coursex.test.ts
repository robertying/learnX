import axios from 'axios';
import { GraphQLClient } from 'graphql-request';
import { useCredentialsStore } from 'data/credentials';
import type { Course } from 'data/types/state';
import { uploadCourses } from 'helpers/coursex';
import { setServerWritesAllowed } from 'helpers/serverWrites';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('graphql-request', () => {
  const request = jest.fn(async () => ({}));
  return {
    gql: (strings: TemplateStringsArray) => strings.join(''),
    GraphQLClient: jest.fn(() => ({ request })),
  };
});
jest.mock('helpers/env', () => ({
  __esModule: true,
  default: { DUMMY_USERNAME: 'mock-user' },
  getCourseXRefreshToken: () => 'refresh-token',
}));

// The client is made on import, before clearMocks runs.
const request = jest.mocked(GraphQLClient).mock.results[0].value.request;
const post = jest.mocked(axios.post);

const course: Course = {
  id: 'c1',
  name: 'Calculus',
  chineseName: '微积分',
  englishName: 'Calculus',
  teacherName: '张三',
  teacherNumber: 't1',
  courseNumber: '10420',
  courseIndex: 2,
  timeAndLocation: ['星期一第2节(全周)，六教6A414'],
  semesterId: '2026-2027-1',
};

beforeEach(() => setServerWritesAllowed(true));
afterEach(() => setServerWritesAllowed(false));

it("never uploads the mock account's courses", async () => {
  useCredentialsStore.setState({
    credentials: {
      username: 'mock-user',
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });
  await uploadCourses([course]);
  useCredentialsStore.setState({ credentials: null });
  expect(post).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});

it('is blocked in debug builds until server writes are allowed', async () => {
  setServerWritesAllowed(false);
  await expect(uploadCourses([course])).rejects.toThrow('Allow Server Writes');
  expect(post).not.toHaveBeenCalled();
});

it('signs in with the refresh token and uploads the courses', async () => {
  post.mockResolvedValueOnce({ data: { accessToken: 'access' } });
  await uploadCourses([course]);
  expect(post).toHaveBeenCalledWith('https://tsinghua.app/api/auth/session', {
    refreshToken: 'refresh-token',
  });
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining('insert_course'),
    {
      objects: [
        {
          id: 'c1',
          name: '微积分',
          teacher: {
            data: { id: 't1', name: '张三' },
            on_conflict: {
              constraint: 'teacher_pkey',
              update_columns: ['name'],
            },
          },
          time_location: '["星期一第2节(全周)，六教6A414"]',
          semester_id: '2026-2027-1',
          number: '10420',
          index: 2,
          englishName: 'Calculus',
        },
      ],
    },
    { Authorization: 'Bearer access' },
  );
});

it('uploads nothing without an access token', async () => {
  post.mockResolvedValueOnce({ data: {} });
  await uploadCourses([course]);
  expect(request).not.toHaveBeenCalled();
});
