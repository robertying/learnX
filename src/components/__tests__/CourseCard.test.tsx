import { Dimensions } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import dayjs from 'dayjs';
import { NOW, course } from 'test-utils/fixtures/cards';
import CourseCard from 'components/CourseCard';
import SystemIcon from 'components/SystemIcon';

jest.mock('components/SystemIcon', () => jest.fn(() => null));

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
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

  it('grows the count icons with the text, up to twice their size', async () => {
    const window = Dimensions.get('window');
    const iconSizes = () =>
      jest
        .mocked(SystemIcon)
        .mock.calls.findLast(([props]) => props.name === 'notices')![0].size;
    const atFontScale = (fontScale: number) =>
      act(() => {
        Dimensions.set({ window: { ...window, fontScale } });
      });

    await atFontScale(1);
    await render(<CourseCard data={course} />);
    expect(iconSizes()).toBe(15);
    await atFontScale(1.5);
    expect(iconSizes()).toBe(23);
    await atFontScale(3);
    expect(iconSizes()).toBe(30);
    await atFontScale(window.fontScale);
  });
});
