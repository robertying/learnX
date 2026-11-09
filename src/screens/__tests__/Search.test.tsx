import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { SearchBarProps } from 'react-native-screens';
import { Assignment, File, Notice } from 'data/types/state';
import Search from 'screens/Search';

jest.mock('react-native-screens/experimental', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const mockNotices: Notice[] = [
  {
    id: 'n1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Midterm room change',
    content: 'Moved to Room 101',
    publisher: 'TA Wang',
    publishTime: '2026-03-08T12:00:00+08:00',
    markedImportant: false,
    hasRead: true,
  } as Notice,
];
const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    courseId: 'c2',
    courseName: 'Physics',
    courseTeacherName: 'Prof. Zhao',
    title: 'Midterm review problems',
    description: '',
    deadline: '2026-03-12T23:59:00+08:00',
    submitted: false,
    graded: false,
  } as unknown as Assignment,
];
const mockFiles: File[] = [
  {
    id: 'f1',
    courseId: 'c1',
    courseName: 'Calculus',
    courseTeacherName: 'Prof. Li',
    title: 'Lecture 5 slides',
    description: '',
    size: '2.1 MB',
    fileType: 'pdf',
    markedImportant: false,
    isNew: false,
    uploadTime: '2026-03-09T12:00:00+08:00',
  } as unknown as File,
];

jest.mock('data/content', () => ({
  useNotices: () => ({ notices: mockNotices }),
  useAssignments: () => ({ assignments: mockAssignments }),
  useFiles: () => ({ files: mockFiles }),
}));

const setup = async (query?: string) => {
  const searchBar = { focus: jest.fn(), setText: jest.fn() };
  const navigation = {
    setOptions: jest.fn(),
    push: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    getParent: jest.fn(() => undefined),
  };
  await render(
    <Search
      navigation={navigation as never}
      route={{ key: 'Search', name: 'Search', params: { query } } as never}
    />,
  );
  const options = (): SearchBarProps =>
    navigation.setOptions.mock.lastCall[0].headerSearchBarOptions;
  (options().ref as React.RefObject<unknown>).current = searchBar;
  const type = (text: string) =>
    act(() =>
      options().onChangeText!({
        nativeEvent: { text },
      } as never),
    );
  return { navigation, searchBar, options, type };
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-03-10T12:00:00+08:00') });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Search', () => {
  it('starts empty with the system search bar in the header', async () => {
    const { options } = await setup();
    expect(options().placeholder).toBe('Notices, assignments and files');
    expect(screen.getByText('Nothing Here')).toBeTruthy();
  });

  it('groups matches by kind under section headers', async () => {
    const { type } = await setup();
    await type('midterm');
    expect(screen.getByText('Notices')).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.getByText('Assignments')).toBeTruthy();
    expect(screen.getByText('Midterm review problems')).toBeTruthy();
    // No file matches, so no Files header
    expect(screen.queryByText('Files')).toBeNull();
    expect(screen.queryByText('Lecture 5 slides')).toBeNull();
  });

  it('opens a result in the search stack', async () => {
    const { type, navigation } = await setup();
    await type('slides');
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByText('Lecture 5 slides'));
    expect(navigation.push).toHaveBeenCalledWith('FileDetail', { id: 'f1' });
  });

  it('clears the results when the search bar closes', async () => {
    const { type, options } = await setup();
    await type('calculus');
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    await act(() => options().onClose!());
    expect(screen.getByText('Nothing Here')).toBeTruthy();
  });

  it('searches for a query it was opened with and fills it in the bar', async () => {
    const { searchBar } = await setup('physics');
    expect(screen.getByText('Midterm review problems')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(50));
    expect(searchBar.setText).toHaveBeenCalledWith('physics');
    expect(searchBar.focus).toHaveBeenCalledTimes(1);
  });

  it('keeps focusing the bar until it reports focus', async () => {
    const { searchBar, options } = await setup();
    await act(() => jest.advanceTimersByTime(200));
    expect(searchBar.focus).toHaveBeenCalledTimes(2);
    expect(searchBar.setText).not.toHaveBeenCalled();
    await act(() => options().onFocus!({} as never));
    await act(() => jest.advanceTimersByTime(1000));
    expect(searchBar.focus).toHaveBeenCalledTimes(2);
  });
});
