import { render, screen } from '@testing-library/react-native';
import { useAppStateStore } from 'data/appState';
import { useCredentialsStore } from 'data/credentials';
import { t } from 'helpers/i18n';
import {
  AssignmentStack,
  AssignmentSubmissionStack,
  CourseStack,
  CourseXStack,
  FileStack,
  LoginStack,
  NoticeStack,
  SearchStack,
  SettingStack,
  TodayStack,
  WhatsNewStack,
} from 'navigation/stacks';
import { stackScreenOptions } from 'navigation/options';
import { navigatorConfig, optionsArgs } from 'test-utils/mocks/navigator';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: require('test-utils/mocks/navigator')
    .createNavigator,
}));
// The error layout's retry reloads through expo, which is ESM only.
jest.mock('services/crashReporting', () => ({ recordError: jest.fn() }));
jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
// Only the setup is under test, so the screens are stand-ins.
jest.mock('screens/About', () => () => null);
jest.mock('screens/AssignmentDetail', () => () => null);
jest.mock('screens/AssignmentSubmission', () => () => null);
jest.mock('screens/Assignments', () => () => null);
jest.mock('screens/CalendarSettings', () => () => null);
jest.mock('screens/Changelog', () => () => null);
jest.mock('screens/CourseDetail', () => () => null);
jest.mock('screens/CourseInformationSharing', () => () => null);
jest.mock('screens/CourseX', () => () => null);
jest.mock('screens/Courses', () => () => null);
jest.mock('screens/Downloads', () => () => null);
jest.mock('screens/FileDetail', () => () => null);
jest.mock('screens/Files', () => () => null);
jest.mock('screens/Help', () => () => null);
jest.mock('screens/Login', () => () => null);
jest.mock('screens/Maintainer', () => () => null);
jest.mock('screens/MockNetwork', () => () => null);
jest.mock('screens/Debug', () => () => null);
jest.mock('screens/NoticeDetail', () => () => null);
jest.mock('screens/Notices', () => () => null);
jest.mock('screens/NotificationSettings', () => () => null);
jest.mock('screens/SSO', () => () => null);
jest.mock('screens/Search', () => () => null);
jest.mock('screens/SemesterSelection', () => () => null);
jest.mock('screens/Settings', () => () => null);
jest.mock('screens/Today', () => () => null);
jest.mock('screens/Welcome', () => () => null);
jest.mock('screens/WhatsNew', () => () => null);

const configOf = async (Stack: React.ComponentType) => {
  const { unmount } = await render(<Stack />);
  const config = navigatorConfig(screen.getByTestId('navigator'));
  await unmount();
  return config;
};
const names = async (Stack: React.ComponentType) =>
  (await configOf(Stack)).screens.map(s => s.name);

const settingDetails = [
  'CourseInformationSharing',
  'CalendarSettings',
  'SemesterSelection',
  'Downloads',
  'NotificationSettings',
  'SwipeActions',
  'Maintainer',
  'Help',
  'About',
  'Changelog',
  'MockNetwork',
  'Debug',
];
const itemDetails = [
  'CourseDetail',
  'NoticeDetail',
  'AssignmentDetail',
  'FileDetail',
];

it('opens the details each tab links to, in its own stack', async () => {
  expect(await names(NoticeStack)).toEqual([
    'Notices',
    'NoticeDetail',
    'FileDetail',
  ]);
  expect(await names(AssignmentStack)).toEqual([
    'Assignments',
    'AssignmentDetail',
    'FileDetail',
  ]);
  expect(await names(FileStack)).toEqual(['Files', 'FileDetail']);
  expect(await names(CourseStack)).toEqual(['Courses', ...itemDetails]);
  expect(await names(SettingStack)).toEqual(['Settings', ...settingDetails]);
  // Settings open from Today where there's no Settings tab.
  expect(await names(TodayStack)).toEqual([
    'Today',
    'Schedule',
    ...itemDetails,
    'Settings',
    ...settingDetails,
  ]);
});

it('titles the screens, and every screen has a component and the error layout', async () => {
  for (const Stack of [
    NoticeStack,
    AssignmentStack,
    FileStack,
    CourseStack,
    SettingStack,
    TodayStack,
    LoginStack,
    WhatsNewStack,
    CourseXStack,
    SearchStack,
    AssignmentSubmissionStack,
  ]) {
    const config = await configOf(Stack);
    expect(config.screenLayout).toBe(true);
    for (const s of config.screens) {
      expect(s.component).toBe(true);
    }
  }
  const today = await configOf(TodayStack);
  expect(today.screens[0].options?.title).toBe(t('today'));
  expect(today.screens[1].options?.title).toBe(t('schedule'));
  expect(today.screens.find(s => s.name === 'Downloads')?.options?.title).toBe(
    t('downloads'),
  );
  expect(
    today.screens.find(s => s.name === 'MockNetwork')?.options?.title,
  ).toBe('Network Emulation');
  // Detail screens are titled from the cached item they show (none here).
  expect(today.screens[2].groupOptions?.title).toBe('');
});

it('leaves the glass header to every stack, with no screen of its own', async () => {
  // A screen setting its own header background or transparency would lose
  // the iOS 26 glass, or put content that doesn't scroll under the header.
  for (const Stack of [
    NoticeStack,
    AssignmentStack,
    FileStack,
    CourseStack,
    SettingStack,
    TodayStack,
    LoginStack,
    WhatsNewStack,
    CourseXStack,
    SearchStack,
    AssignmentSubmissionStack,
  ]) {
    const config = await configOf(Stack);
    expect(config.screenOptions).toEqual(stackScreenOptions);
    for (const s of config.screens) {
      for (const options of [s.options ?? {}, s.groupOptions ?? {}]) {
        expect(options).not.toHaveProperty('headerTransparent');
        expect(options).not.toHaveProperty('headerStyle');
      }
    }
  }
});

it('opens the modal stacks with a close button', async () => {
  for (const [Stack, first, title] of [
    [CourseXStack, 'CourseX', t('courseX')],
    [SearchStack, 'Search', t('search')],
    [
      AssignmentSubmissionStack,
      'AssignmentSubmission',
      t('assignmentSubmission'),
    ],
  ] as const) {
    const config = await configOf(Stack);
    expect(config.screens[0]).toMatchObject({
      name: first,
      options: { title, headerLeft: true, unstable_headerLeftItems: true },
    });
  }
  expect(await names(SearchStack)).toEqual([
    'Search',
    'NoticeDetail',
    'AssignmentDetail',
    'FileDetail',
  ]);
  expect(await names(AssignmentSubmissionStack)).toEqual([
    'AssignmentSubmission',
    'FileDetail',
  ]);
});

it("shows What's New in a sheet, with the changelog a push away", async () => {
  const config = await configOf(WhatsNewStack);
  expect(config.screens).toEqual([
    expect.objectContaining({
      name: 'WhatsNew',
      options: {
        headerShown: false,
        headerTitle: '',
        title: t('whatsNew'),
      },
    }),
    expect.objectContaining({ name: 'Changelog' }),
  ]);
});

describe('LoginStack', () => {
  afterEach(() => {
    useAppStateStore.setState({ welcomeSeen: false });
    useCredentialsStore.setState({ credentials: null });
  });

  it('welcomes a new install, and goes straight to the login after', async () => {
    useAppStateStore.setState({ welcomeSeen: false });
    expect((await configOf(LoginStack)).initialRouteName).toBe('Welcome');
    useAppStateStore.setState({ welcomeSeen: true });
    expect((await configOf(LoginStack)).initialRouteName).toBe('Login');
  });

  it('skips the welcome for someone logged out', async () => {
    useCredentialsStore.setState({
      credentials: {
        username: 'u',
        password: '',
        fingerPrint: '',
        fingerGenPrint: '',
        fingerGenPrint3: '',
      },
    });
    expect((await configOf(LoginStack)).initialRouteName).toBe('Login');
  });

  it('opens SSO full screen with a close button, in place on Mac', async () => {
    const config = await configOf(LoginStack);
    expect(config.screens.map(s => s.name)).toEqual([
      'Welcome',
      'Login',
      'SSO',
      'MockNetwork',
    ]);
    expect(config.screens[2].options).toMatchObject({
      title: t('sso'),
      presentation: 'fullScreenModal',
    });
    expect(optionsArgs.navigation.goBack).not.toHaveBeenCalled();
  });
});
