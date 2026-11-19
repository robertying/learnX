import { act, fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import Storage from 'expo-sqlite/kv-store';
import WindowFrame from 'navigation/WindowFrame';
import { t } from 'helpers/i18n';
import FluentRoot from 'web/FluentRoot';
import {
  createNativeBottomTabNavigator,
  EXPANDED_FROM,
  tabIcon,
} from 'web/packages/navigationPane';

// The in-memory store the phones' tests use, for the Electron app's.
jest.mock('expo-sqlite/kv-store', () =>
  require('test-utils/mocks/sqliteKvStore'),
);
const store = (Storage as unknown as { __store: Map<string, string> }).__store;
beforeEach(() => store.clear());

const Tabs = createNativeBottomTabNavigator();

const One = () => <Text>first screen</Text>;
const Two = () => <Text>second screen</Text>;
const Settings = () => <Text>settings screen</Text>;

// React Native Web's window size follows the window's resize events.
const setWidth = (width: number) => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: width,
    configurable: true,
  });
  window.dispatchEvent(new Event('resize'));
};

const renderPane = (
  onTabPress?: (e: { preventDefault: () => void }) => void,
  framed = true,
) => {
  const tabs = (
    <Tabs.Navigator>
      <Tabs.Screen
        name="One"
        component={One}
        options={{
          title: 'First',
          tabBarButtonTestID: 'tab-one',
          tabBarIcon: ({ focused }: { focused: boolean }) => ({
            uri: `tab_notifications${focused ? '_filled' : ''}`,
          }),
        }}
      />
      <Tabs.Screen
        name="Two"
        component={Two}
        options={{ tabBarButtonTestID: 'tab-two', lazy: true }}
        listeners={onTabPress ? { tabPress: onTabPress } : undefined}
      />
      <Tabs.Screen
        name="SettingStack"
        component={Settings}
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'tab-settings',
          tabBarBadge: '',
          lazy: false,
        }}
      />
    </Tabs.Navigator>
  );
  return render(
    <FluentRoot>
      <NavigationContainer>
        {framed ? <WindowFrame>{tabs}</WindowFrame> : tabs}
      </NavigationContainer>
    </FluentRoot>,
  );
};

it('switches tabs, keeping each mounted once shown', async () => {
  setWidth(1200);
  renderPane();
  expect(screen.getByText('first screen')).toBeTruthy();
  expect(screen.queryByText('second screen')).toBeNull();
  // Not lazy: mounted, hidden
  expect(screen.getByText('settings screen')).toBeTruthy();
  expect(screen.getByTestId('tab-one').getAttribute('aria-selected')).toBe(
    'true',
  );
  // Expanded in a wide window: titles show, a route's name without one
  expect(screen.getByText('First')).toBeTruthy();
  expect(screen.getByText('Two')).toBeTruthy();

  await act(async () => fireEvent.click(screen.getByTestId('tab-two')));
  expect(screen.getByText('second screen')).toBeTruthy();
  expect(screen.getByTestId('tab-two').getAttribute('aria-selected')).toBe(
    'true',
  );
  await act(async () => fireEvent.click(screen.getByTestId('tab-one')));
  expect(screen.getByText('second screen')).toBeTruthy();
});

it('stays on the tab when a listener prevents the press', async () => {
  setWidth(1200);
  renderPane(e => e.preventDefault(), false);
  await act(async () => fireEvent.click(screen.getByTestId('tab-two')));
  expect(screen.getByTestId('tab-one').getAttribute('aria-selected')).toBe(
    'true',
  );
});

it('is a rail of icons in a narrower window, until expanded', async () => {
  setWidth(EXPANDED_FROM - 1);
  renderPane();
  expect(screen.queryByText('First')).toBeNull();
  const toggle = screen.getByTestId('navigation-pane-toggle');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await act(async () => fireEvent.click(toggle));
  expect(screen.getByText('First')).toBeTruthy();
  await act(async () => fireEvent.click(toggle));
  expect(screen.queryByText('First')).toBeNull();
});

it("keeps the menu button's choice across launches, whatever the window's width", async () => {
  setWidth(1200);
  const { unmount } = renderPane();
  await act(async () =>
    fireEvent.click(screen.getByTestId('navigation-pane-toggle')),
  );
  expect(screen.queryByText('First')).toBeNull();
  unmount();

  renderPane();
  expect(screen.queryByText('First')).toBeNull();
  expect(
    screen.getByTestId('navigation-pane-toggle').getAttribute('aria-expanded'),
  ).toBe('false');
});

it('keeps the pane expanded in a narrower window once the user expanded it', async () => {
  setWidth(EXPANDED_FROM - 1);
  const { unmount } = renderPane();
  await act(async () =>
    fireEvent.click(screen.getByTestId('navigation-pane-toggle')),
  );
  unmount();

  renderPane();
  expect(screen.getByText('First')).toBeTruthy();
});

it('lists every tab, Settings too, and says its badge', () => {
  setWidth(1200);
  renderPane();
  const tabs = screen.getByRole('tablist');
  expect(
    Array.from(tabs.querySelectorAll('[role="tab"]')).map(tab =>
      tab.getAttribute('aria-label'),
    ),
  ).toEqual(['First', 'Two', `Settings, ${t('a11yNewBadge')}`]);
});

it("finds a tab's icon from its Android drawable name", () => {
  expect(tabIcon({ uri: 'tab_notifications_filled' })).toBe('notices');
  expect(tabIcon({ uri: 'tab_folder' })).toBe('files');
  expect(tabIcon({ uri: 'tab_unknown' })).toBeUndefined();
  expect(tabIcon(undefined)).toBeUndefined();
});
