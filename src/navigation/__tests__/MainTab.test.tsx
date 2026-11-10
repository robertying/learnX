import { Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { t } from 'helpers/i18n';
import useKeyboardShown from 'hooks/useKeyboardShown';
import useSettingsBadge from 'hooks/useSettingsBadge';
import { useSplitLaidOut } from 'navigation/NativeSplitView';
import {
  lastNavigatorScreens,
  navigatorConfig,
} from '../../../jest/mocks/navigator';

jest.mock('@bottom-tabs/react-navigation', () => ({
  createNativeBottomTabNavigator: require('../../../jest/mocks/navigator')
    .createNavigator,
}));
jest.mock('navigation/SidebarSplitNavigator', () => ({
  __esModule: true,
  default: require('../../../jest/mocks/navigator').createNavigator,
}));
jest.mock('navigation/NativeSplitView', () => ({
  useSplitLaidOut: jest.fn(() => true),
}));
jest.mock('navigation/DetailStack', () => ({
  renderDetailContainer: jest.fn(),
  TabSplit: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('navigation/stacks', () => {
  const { Text } = require('react-native');
  const stack = (name: string) => () => <Text>{name}</Text>;
  return {
    TodayStack: stack('TodayStack'),
    NoticeStack: stack('NoticeStack'),
    AssignmentStack: stack('AssignmentStack'),
    FileStack: stack('FileStack'),
    CourseStack: stack('CourseStack'),
    SettingStack: stack('SettingStack'),
  };
});
jest.mock('hooks/useKeyboardShown', () => jest.fn(() => false));
jest.mock('hooks/useMainCommands', () => jest.fn());
jest.mock('hooks/useLaunchSheet', () => jest.fn());
jest.mock('hooks/useMainStartup', () => jest.fn());
jest.mock('hooks/useSettingsBadge', () => jest.fn(() => false));

let mockLayout = { nativeSplit: true, sidebarSplit: false };
jest.mock('navigation/layout', () => ({
  get nativeSplit() {
    return mockLayout.nativeSplit;
  },
  get sidebarSplit() {
    return mockLayout.sidebarSplit;
  },
}));

// The tabs are set up when the module loads, so each layout loads it afresh,
// with the same React as the test.
const shared = {
  react: require('react'),
  compilerRuntime: require('react/compiler-runtime'),
  reactNative: require('react-native'),
  navigator: require('../../../jest/mocks/navigator'),
};
const loadMainTab = (layout: typeof mockLayout) => {
  mockLayout = layout;
  let MainTab: React.ComponentType = () => null;
  jest.isolateModules(() => {
    jest.doMock('react', () => shared.react);
    jest.doMock('react/compiler-runtime', () => shared.compilerRuntime);
    jest.doMock('react-native', () => shared.reactNative);
    jest.doMock('../../../jest/mocks/navigator', () => shared.navigator);
    MainTab = require('navigation/MainTab').default;
  });
  return MainTab;
};

const config = () => navigatorConfig(screen.getByTestId('navigator'));
const lazy = () => config().screens.map(s => s.options?.lazy);

const idle: (() => void)[] = [];
const os = Platform.OS;
beforeEach(() => {
  idle.length = 0;
  globalThis.requestIdleCallback = jest.fn(callback => {
    idle.push(callback as () => void);
    return idle.length;
  });
  globalThis.cancelIdleCallback = jest.fn();
});
afterEach(() => {
  Platform.OS = os;
});

const runIdle = () => act(() => idle.shift()!());

const iPhone = { nativeSplit: true, sidebarSplit: false };
const mac = { nativeSplit: true, sidebarSplit: true };
const android = { nativeSplit: false, sidebarSplit: false };

it('shows five tabs in the tab bar, mounting the first and then the rest one by one', async () => {
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  expect(config().screens.map(s => s.name)).toEqual([
    'TodayStack',
    'NoticeStack',
    'AssignmentStack',
    'FileStack',
    'CourseStack',
  ]);
  expect(config().screens.map(s => s.options?.title)).toEqual(
    ['today', 'notices', 'assignments', 'files', 'courses'].map(key =>
      t(key as never),
    ),
  );
  expect(config().screens[1].options).toMatchObject({
    tabBarButtonTestID: 'tab-notices',
  });
  expect(lazy()).toEqual([false, true, true, true, true]);

  for (let mounted = 2; mounted <= 5; mounted++) {
    await runIdle();
    expect(lazy().filter(Boolean)).toHaveLength(5 - mounted);
  }
  expect(idle).toHaveLength(0);
});

it('waits for a split to be laid out before mounting the other tabs', async () => {
  jest.mocked(useSplitLaidOut).mockReturnValue(false);
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  expect(idle).toHaveLength(0);
});

it('wraps each tab in a split of its own, with SF Symbols', async () => {
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  const today = lastNavigatorScreens()[0];
  await render(<>{today.options && (today.component as React.FC)({})}</>);
  expect(screen.getByText('TodayStack')).toBeTruthy();
  const icon = (today.options!.tabBarIcon as () => unknown)();
  expect(icon).toEqual({ sfSymbol: 'sun.max.fill' });
});

it('badges Today for Settings, and hides the tab bar for the keyboard', async () => {
  jest.mocked(useSettingsBadge).mockReturnValue(true);
  jest.mocked(useKeyboardShown).mockReturnValue(true);
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  expect(config().screens[0].options?.tabBarBadge).toBe(' ');
  expect(config().screens[1].options?.tabBarBadge).toBeUndefined();
  expect(config().tabBarHidden).toBe(true);
});

it('uses Material icons and the card color on Android', async () => {
  Platform.OS = 'android';
  const MainTab = loadMainTab(android);
  await render(<MainTab />);
  expect(config().tabBarStyle).toEqual({ backgroundColor: expect.any(String) });
  const icon = (
    lastNavigatorScreens()[0].options!.tabBarIcon as () => unknown
  )();
  expect(icon).toEqual(expect.objectContaining({ uri: expect.any(String) }));
});

it('puts six tabs, Settings with its badge, in the sidebar on Mac', async () => {
  jest.mocked(useSettingsBadge).mockReturnValue(true);
  const MainTab = loadMainTab(mac);
  await render(<MainTab />);
  const { screens, renderDetail } = config();
  expect(renderDetail).toBe(true);
  expect(screens.map(s => s.name)).toEqual([
    'TodayStack',
    'NoticeStack',
    'AssignmentStack',
    'FileStack',
    'CourseStack',
    'SettingStack',
  ]);
  expect(screens[5].options).toMatchObject({
    title: t('settings'),
    sfSymbol: 'gearshape.fill',
    badge: true,
  });
  expect(screens[0].options?.badge).toBe(false);
});
