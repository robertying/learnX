import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { SearchBarProps } from 'react-native-screens';
import { Notice } from 'data/types/state';
import { resetUserData, setArchived } from 'data/userData';
import Search from 'screens/Search';
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

jest.mock('data/content', () => ({
  useNotices: () => ({ notices: mockNotices }),
  useAssignments: () => ({ assignments: [] }),
  useFiles: () => ({ files: [] }),
}));

afterEach(async () => {
  await act(() => resetUserData());
});

const setup = async () => {
  const navigation = {
    setOptions: jest.fn(),
    push: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    getParent: jest.fn(),
  };
  await render(
    <Search
      {...screenProps({
        navigation,
        route: { key: 'Search', name: 'Search', params: undefined },
      })}
    />,
  );
  const options = (): SearchBarProps =>
    navigation.setOptions.mock.calls.findLast(
      ([o]) => o.headerSearchBarOptions,
    )[0].headerSearchBarOptions;
  const type = (text: string) =>
    act(() => options().onChangeText!({ nativeEvent: { text } } as never));
  return { navigation, type };
};

describe('Search (Android)', () => {
  it('shows chips for the kinds and the filter menu beside them, not in the toolbar', async () => {
    await act(() => setArchived('notice', ['n1'], true));
    const { navigation, type } = await setup();
    expect(screen.queryByTestId('filter')).toBeNull();
    await type('midterm');
    expect(screen.getByRole('checkbox', { name: 'All' })).toBeChecked();
    expect(
      navigation.setOptions.mock.calls.some(([o]) => 'headerRight' in o),
    ).toBe(false);
    expect(screen.getByText('Midterm room change')).toBeTruthy();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('filter'));
    await user.press(screen.getByTestId('filter-archived'));
    expect(screen.queryByText('Midterm room change')).toBeNull();
    await user.press(screen.getByText('Notices'));
    expect(screen.getByRole('checkbox', { name: 'Notices' })).toBeChecked();
  });
});
