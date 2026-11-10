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
  jest.restoreAllMocks();
});

// Beijing time, as Jest runs in Asia/Shanghai
const at = (time: string) =>
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse(`${time}+08:00`));
type TabBarIcon = (props: { focused: boolean }) => unknown;
const tabBarIcon = (index: number, focused = false) =>
  (lastNavigatorScreens()[index].options!.tabBarIcon as TabBarIcon)({
    focused,
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

it('wraps each tab in a split of its own, with filled SF Symbols', async () => {
  at('2026-03-15T14:00:00');
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  const today = lastNavigatorScreens()[0];
  await render(<>{today.options && (today.component as React.FC)({})}</>);
  expect(screen.getByText('TodayStack')).toBeTruthy();
  expect([0, 1, 2, 3, 4].map(i => tabBarIcon(i))).toEqual([
    { sfSymbol: 'sun.max.fill' },
    { sfSymbol: 'bell.fill' },
    { sfSymbol: 'list.bullet.clipboard.fill' },
    { sfSymbol: 'folder.fill' },
    { sfSymbol: 'books.vertical.fill' },
  ]);
});

it.each([
  ['04:59', 'moon.stars.fill', 'bedtime'],
  ['05:00', 'sunrise.fill', 'wb_twilight'],
  ['11:00', 'sun.max.fill', 'light_mode'],
  ['17:00', 'sunset.fill', 'routine'],
  ['20:00', 'moon.stars.fill', 'bedtime'],
])(
  'draws the Today tab for the time of day at %s',
  async (time, ios, material) => {
    at(`2026-03-15T${time}:00`);
    const MainTab = loadMainTab(iPhone);
    await render(<MainTab />);
    expect(tabBarIcon(0)).toEqual({ sfSymbol: ios });
    Platform.OS = 'android';
    expect(tabBarIcon(0)).toEqual({ uri: `tab_${material}` });
  },
);

it('leaves the Settings badge off the tab bar, and hides it for the keyboard', async () => {
  jest.mocked(useSettingsBadge).mockReturnValue(true);
  jest.mocked(useKeyboardShown).mockReturnValue(true);
  const MainTab = loadMainTab(iPhone);
  await render(<MainTab />);
  for (const tab of config().screens) {
    expect(tab.options?.tabBarBadge).toBeUndefined();
  }
  expect(config().tabBarHidden).toBe(true);
});

it('uses Material Symbols, filled on the selected tab, and the card color on Android', async () => {
  at('2026-03-15T22:00:00');
  Platform.OS = 'android';
  const MainTab = loadMainTab(android);
  await render(<MainTab />);
  expect(config().tabBarStyle).toEqual({ backgroundColor: expect.anything() });
  expect([0, 1, 2, 3, 4].map(i => tabBarIcon(i))).toEqual(
    ['bedtime', 'notifications', 'assignment', 'folder', 'book_2'].map(
      name => ({ uri: `tab_${name}` }),
    ),
  );
  expect(tabBarIcon(1, true)).toEqual({ uri: 'tab_notifications_filled' });
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
  // outline symbols, as in Finder's and Mail's sidebars
  expect(screens.map(s => s.options?.sfSymbol)).toEqual([
    expect.stringMatching(/^(sunrise|sun\.max|sunset|moon\.stars)$/),
    'bell',
    'list.bullet.clipboard',
    'folder',
    'books.vertical',
    'gearshape',
  ]);
  expect(screens[5].options).toMatchObject({
    title: t('settings'),
    badge: true,
  });
  expect(screens[0].options?.badge).toBe(false);
});

it('has an outlined and a filled drawable for each Android tab icon', () => {
  const { existsSync } = require('fs') as {
    existsSync: (path: string) => boolean;
  };
  const { systemIcons } = require('helpers/systemIcons');
  const icons = [
    'notices',
    'assignments',
    'files',
    'courses',
    'morning',
    'afternoon',
    'evening',
    'night',
  ] as const;
  for (const icon of icons) {
    const symbol = systemIcons[icon].android;
    for (const file of [`tab_${symbol}.xml`, `tab_${symbol}_filled.xml`]) {
      const path = `android/app/src/main/res/drawable/${file}`;
      expect([path, existsSync(path)]).toEqual([path, true]);
    }
  }
});
