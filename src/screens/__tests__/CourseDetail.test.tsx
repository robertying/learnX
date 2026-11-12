import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import {
  mockAssignments,
  mockCourses,
  mockFiles,
  mockNotices,
} from 'data/mock';
import { useCourse } from 'data/queries';
import { t } from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import * as options from 'navigation/options';
import CourseDetail from 'screens/CourseDetail';
import { screenProps } from 'test-utils/screenProps';

const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ push: mockPush }),
}));
jest.mock('data/queries', () => ({ useCourse: jest.fn() }));
const mockRefresh = {
  notice: { isPending: false, mutate: jest.fn() },
  assignment: { isPending: false, mutate: jest.fn() },
  file: { isPending: false, mutate: jest.fn() },
};
jest.mock('data/content', () => ({
  useNotices: () => ({ notices: require('data/mock').mockNotices }),
  useAssignments: () => ({
    assignments: require('data/mock').mockAssignments,
  }),
  useFiles: () => ({ files: require('data/mock').mockFiles }),
  useRefreshCourseNotices: () => mockRefresh.notice,
  useRefreshCourseAssignments: () => mockRefresh.assignment,
  useRefreshCourseFiles: () => mockRefresh.file,
}));
jest.mock('hooks/useDetailNavigator', () => jest.fn(() => undefined));

jest.mock('components/FlatList', () => require('react-native').FlatList);
// The pager, showing the selected tab's page.
jest.mock('react-native-tab-view', () => ({
  TabView: ({
    navigationState,
    renderScene,
    renderTabBar,
    onIndexChange,
  }: {
    navigationState: { index: number; routes: { key: string }[] };
    renderScene: (props: object) => React.ReactNode;
    renderTabBar: (props: object) => React.ReactNode;
    onIndexChange: (index: number) => void;
  }) => {
    const jumpTo = (key: string) =>
      onIndexChange(navigationState.routes.findIndex(r => r.key === key));
    return (
      <>
        {renderTabBar({ navigationState, jumpTo })}
        {renderScene({
          route: navigationState.routes[navigationState.index],
          jumpTo,
        })}
      </>
    );
  },
}));

// A course with notices, assignments and files in the mock data.
const course = mockCourses.find(
  c =>
    mockNotices.some(n => n.courseId === c.id) &&
    mockAssignments.some(a => a.courseId === c.id) &&
    mockFiles.some(f => f.courseId === c.id),
)!;
const of = <T extends { courseId: string }>(items: T[]) =>
  items.filter(i => i.courseId === course.id);

const navigation = { setOptions: jest.fn(), navigate: jest.fn() };
const renderScreen = () =>
  render(
    <CourseDetail
      {...screenProps({ navigation, route: { params: { id: course.id } } })}
    />,
  );

const selectTab = (index: number) =>
  fireEvent(screen.getByText(t('files')), 'selectionChange', index);

beforeEach(() => {
  jest.mocked(useCourse).mockReturnValue(course);
});

afterEach(() => {
  useAuthStore.setState(initialAuth);
});

it('shows Not Found for a course no longer listed', async () => {
  jest.mocked(useCourse).mockReturnValue(undefined);
  await renderScreen();
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
});

it("lists the course's notices, and its assignments and files by tab", async () => {
  await renderScreen();
  expect(navigation.setOptions).toHaveBeenCalledWith(
    expect.objectContaining({ title: course.name }),
  );
  expect(screen.getByText(of(mockNotices)[0].title)).toBeTruthy();
  // Separators between the rows, none under the last.
  expect(screen.queryAllByTestId('card-separator')).toHaveLength(
    of(mockNotices).length - 1,
  );
  const other = mockNotices.find(n => n.courseId !== course.id)!;
  expect(screen.queryByText(other.title)).toBeNull();

  await selectTab(1);
  expect(screen.getByText(of(mockAssignments)[0].title)).toBeTruthy();
  await selectTab(2);
  expect(screen.getByText(of(mockFiles)[0].title)).toBeTruthy();
});

it('opens an item on top of the course', async () => {
  await renderScreen();
  const notice = of(mockNotices)[0];
  await userEvent.press(screen.getByText(notice.title));
  expect(mockPush).toHaveBeenCalledWith('NoticeDetail', { id: notice.id });
});

it("refreshes the tab's list only while logged in", async () => {
  await renderScreen();
  // A pull on the list that holds the first row.
  const pull = () => {
    let list = screen.getByText(of(mockNotices)[0].title);
    while (list.type !== 'RCTScrollView') {
      list = list.parent!;
    }
    return fireEvent(list, 'refresh');
  };
  await pull();
  expect(mockRefresh.notice.mutate).not.toHaveBeenCalled();
  await act(() => useAuthStore.setState({ loggedIn: true }));
  await renderScreen();
  await pull();
  expect(mockRefresh.notice.mutate).toHaveBeenCalled();
});

it('opens the course on CourseX from the header', async () => {
  await renderScreen();
  const info = () =>
    navigation.setOptions.mock.calls
      .findLast(([o]) => o.unstable_headerRightItems)![0]
      .unstable_headerRightItems()[0];
  info().onPress();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseXStack', {
    screen: 'CourseX',
    params: { id: course.id },
  });

  const push = jest.fn();
  jest.mocked(useDetailNavigator).mockReturnValue({ push } as never);
  await renderScreen();
  info().onPress();
  expect(push).toHaveBeenCalledWith('CourseX', { id: course.id });
  jest.mocked(useDetailNavigator).mockReturnValue(undefined);
});

describe('from iOS 26', () => {
  beforeEach(() => {
    jest.replaceProperty(options, 'hasGlassHeader', true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the selected list under floating tabs once they are laid out', async () => {
    await renderScreen();
    // No list until the tabs' height is known, so it starts below them.
    expect(screen.queryByText(of(mockNotices)[0].title)).toBeNull();
    await fireEvent(screen.getByText(t('files')), 'layout', {
      nativeEvent: { layout: { height: 52 } },
    });
    expect(screen.getByText(of(mockNotices)[0].title)).toBeTruthy();

    await selectTab(2);
    expect(screen.getByText(of(mockFiles)[0].title)).toBeTruthy();
    expect(screen.queryByText(of(mockNotices)[0].title)).toBeNull();
  });
});
