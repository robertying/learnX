import { render, screen } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { mockLocale } from '../../../jest/locale';
import { NOW, course } from '../../../jest/fixtures/cards';
import CourseCard from 'components/CourseCard';

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  mockLocale.current = 'en-US';
  dayjs.locale('en');
});

describe('CourseCard', () => {
  it('shows the course with only the counts that are not zero', async () => {
    await render(<CourseCard data={course} />);
    expect(screen.getByText('Prof. Li')).toBeTruthy();
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Calculus, Prof. Li, 2 unread notices, 1 unfinished assignment',
      }),
    ).toBeTruthy();
  });

  it('is named for E2E flows', async () => {
    await render(<CourseCard data={course} />);
    expect(screen.getByTestId('course-card')).toBeOnTheScreen();
  });
});
