import axios from 'axios';
import { useCredentialsStore } from 'data/credentials';
import type { Course } from 'data/types/state';
import { uploadCourses } from 'services/coursex';
import { setServerWritesAllowed } from 'helpers/serverWrites';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('helpers/env', () => ({
  __esModule: true,
  default: { DUMMY_USERNAME: 'mock-user' },
}));

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
});

it('is blocked in debug builds until server writes are allowed', async () => {
  setServerWritesAllowed(false);
  await expect(uploadCourses([course])).rejects.toThrow('Allow Server Writes');
  expect(post).not.toHaveBeenCalled();
});

it('uploads the courses to the courseX route, with no token', async () => {
  post.mockResolvedValueOnce({ data: { courses: 1, skipped: 0 } });
  await uploadCourses([
    course,
    { ...course, id: 'c2', timeAndLocation: undefined },
  ]);
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith('https://tsinghua.app/api/learnx/courses', {
    version: 1,
    courses: [
      {
        id: 'c1',
        name: '微积分',
        englishName: 'Calculus',
        teacherId: 't1',
        teacherName: '张三',
        number: '10420',
        index: 2,
        semesterId: '2026-2027-1',
        timeAndLocation: ['星期一第2节(全周)，六教6A414'],
      },
      expect.objectContaining({ id: 'c2', timeAndLocation: undefined }),
    ],
  });
});

it('passes a failed upload on to the caller', async () => {
  post.mockRejectedValueOnce(new Error('Request failed with status code 429'));
  await expect(uploadCourses([course])).rejects.toThrow('429');
});
