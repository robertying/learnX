import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { SearchBarProps } from 'react-native-screens';
import { Assignment, File, Notice } from 'data/types/state';
import Search from 'screens/Search';
import { resetUserData, setCourseHidden } from 'data/userData';
import { screenProps } from 'test-utils/screenProps';

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

type TransitionEnd = (e: { data: { closing: boolean } }) => void;

const setup = async (query?: string, parent?: object) => {
  const searchBar = { focus: jest.fn(), setText: jest.fn() };
  const navigation = {
    setOptions: jest.fn(),
    push: jest.fn(),
    addListener: jest.fn<() => void, [string, TransitionEnd]>(() => jest.fn()),
    getParent: jest.fn(() => parent),
  };
  await render(
    <Search
      {...screenProps({
        navigation,
        route: { key: 'Search', name: 'Search', params: { query } },
      })}
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

afterEach(async () => {
  jest.useRealTimers();
  await act(() => resetUserData());
});

describe('Search', () => {
  it('starts with a prompt and the system search bar in the header', async () => {
    const { options } = await setup();
    expect(options().placeholder).toBe('Notices, assignments and files');
    expect(
      screen.getByText('Search Notices, Assignments and Files'),
    ).toBeTruthy();
    expect(screen.queryByText('No Results')).toBeNull();
  });

  it('says when nothing matches', async () => {
    const { type } = await setup();
    await type('zzzzzz');
    expect(screen.getByText('No Results')).toBeTruthy();
  });

  it('groups matches by kind under section headers', async () => {
    const { type } = await setup();
    await type('midterm');
    expect(screen.getByRole('header', { name: 'Notices' })).toBeTruthy();
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Assignments' })).toBeTruthy();
    expect(screen.getByText('Midterm review problems')).toBeTruthy();
    // No file matches, so no Files header
    expect(screen.queryByText('Files')).toBeNull();
    expect(screen.queryByText('Lecture 5 slides')).toBeNull();
    // Each section's only row is its last, with no separator under it.
    expect(screen.queryByTestId('card-separator')).toBeNull();
  });

  it("leaves out hidden courses' items", async () => {
    await act(() => setCourseHidden('c2', true));
    const { type } = await setup();
    await type('midterm');
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    expect(screen.queryByText('Midterm review problems')).toBeNull();
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
    expect(screen.queryByText('Midterm room change')).toBeNull();
    expect(screen.queryByText('No Results')).toBeNull();
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

  it("focuses the bar as its own or its stack's transition ends, not as one closes", async () => {
    const parent = {
      addListener: jest.fn<() => void, [string, TransitionEnd]>(() =>
        jest.fn(),
      ),
    };
    const { navigation, searchBar } = await setup(undefined, parent);
    const [, own] = navigation.addListener.mock.calls[0];
    const [, stack] = parent.addListener.mock.calls[0];
    await act(() => own({ data: { closing: true } }));
    await act(() => stack({ data: { closing: true } }));
    expect(searchBar.focus).not.toHaveBeenCalled();
    await act(() => stack({ data: { closing: false } }));
    await act(() => own({ data: { closing: false } }));
    expect(searchBar.focus).toHaveBeenCalledTimes(2);
  });

  it('opens notice and assignment results too', async () => {
    const { type, navigation } = await setup();
    await type('midterm');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByText('Midterm room change'));
    await user.press(screen.getByText('Midterm review problems'));
    expect(
      navigation.push.mock.calls.map(([screenName]) => screenName),
    ).toEqual(['NoticeDetail', 'AssignmentDetail']);
  });
});
