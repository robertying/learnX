import { Alert, Linking } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { useAppStateStore } from 'data/appState';
import { initialAuth, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';
import { logout } from 'data/login';
import { userQuery } from 'data/queries';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { t } from 'helpers/i18n';
import { setServerWritesAllowed } from 'helpers/serverWrites';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import { useShowDetail } from 'hooks/useDetailNavigator';
import Settings from 'screens/Settings';

jest.mock('data/login', () => ({ logout: jest.fn() }));
jest.mock('hooks/useAvailableUpdate', () => jest.fn(() => null));
const mockShow = jest.fn();
jest.mock('hooks/useDetailNavigator', () => ({
  useShowDetail: jest.fn(() => mockShow),
}));

const navigation = { navigate: jest.fn() };

const renderScreen = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <Settings navigation={navigation as never} route={{} as never} />
    </QueryClientProvider>,
  );

const credentials = (username: string) =>
  useCredentialsStore.setState({
    credentials: {
      username,
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

beforeEach(() => {
  clearQueryCache();
  credentials('2020000000');
  useAppStateStore.setState({ courseSharingSeen: false });
});

afterEach(() => {
  useAuthStore.setState(initialAuth);
  useCredentialsStore.setState({ credentials: null });
  setServerWritesAllowed(false);
});

it("shows the user's name and department, or the username before they load", async () => {
  await renderScreen();
  expect(screen.getByText('2020000000')).toBeTruthy();

  useAuthStore.setState({ loggedIn: true });
  queryClient.setQueryData(userQuery.queryKey, {
    name: '张三',
    department: '计算机系',
  } as never);
  await renderScreen();
  expect(screen.getByText('张三')).toBeTruthy();
  expect(screen.getByText('计算机系')).toBeTruthy();
});

it('logs out only once confirmed', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderScreen();
  await userEvent.press(screen.getByTestId('settings-logout'));
  const buttons = alert.mock.calls[0][2]!;
  expect(logout).not.toHaveBeenCalled();
  buttons[1].onPress!();
  expect(logout).toHaveBeenCalled();
});

it('opens each page in the detail view', async () => {
  const user = userEvent.setup();
  await renderScreen();
  const pages = {
    semesterSelection: 'SemesterSelection',
    calendarsAndReminders: 'CalendarEvent',
    downloads: 'Downloads',
    swipeActions: 'SwipeActions',
    notifications: 'NotificationSettings',
    courseInformationSharing: 'CourseInformationSharing',
    changelog: 'Changelog',
    becomeMaintainer: 'Maintainer',
    helpAndFeedback: 'Help',
    about: 'About',
  } as const;
  for (const [label, page] of Object.entries(pages)) {
    await user.press(screen.getByText(t(label as keyof typeof pages)));
    expect(mockShow).toHaveBeenLastCalledWith(page);
  }
  expect(useShowDetail).toHaveBeenCalledWith(navigation);
});

it('leaves out Swipe Actions on Mac, which has no swipe', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await renderScreen();
  expect(screen.queryByText(t('swipeActions'))).toBeNull();
  jest.restoreAllMocks();
});

it("opens What's New as a sheet", async () => {
  await renderScreen();
  await userEvent.press(screen.getByTestId('settings-whats-new'));
  expect(navigation.navigate).toHaveBeenCalledWith('WhatsNewStack', {
    screen: 'WhatsNew',
    params: expect.objectContaining({ version: expect.any(String) }),
  });
});

it('marks course sharing never opened, and not the changelog', async () => {
  await renderScreen();
  expect(screen.getAllByLabelText(t('a11yNewBadge'))).toHaveLength(1);
  useAppStateStore.setState({ courseSharingSeen: true });
  await renderScreen();
  expect(screen.queryAllByLabelText(t('a11yNewBadge'))).toHaveLength(0);
});

it('links a newer Android release', async () => {
  jest.mocked(useAvailableUpdate).mockReturnValue({
    version: '20.0.0',
    url: 'https://mirror/learnX.apk',
  });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  await renderScreen();
  await userEvent.press(
    screen.getByText(t('foundNewVersion', { version: '20.0.0' })),
  );
  expect(open).toHaveBeenCalledWith('https://mirror/learnX.apk');
  jest.mocked(useAvailableUpdate).mockReturnValue(null);
});
