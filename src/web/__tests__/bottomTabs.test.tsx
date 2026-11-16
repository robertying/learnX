import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeBottomTabNavigator,
  tabGlyph,
} from 'web/packages/bottomTabs';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-symbols/androidWeights/regular', () => ({
  __esModule: true,
  default: { name: 'MaterialSymbols_400Regular', font: 1 },
}));

const Tabs = createNativeBottomTabNavigator();

const One = () => <Text>first screen</Text>;
const Two = () => <Text>second screen</Text>;
const Three = () => <Text>third screen</Text>;

const renderTabs = (
  props: { tabBarHidden?: boolean } = {},
  onTabPress?: (e: { preventDefault: () => void }) => void,
) =>
  render(
    <NavigationContainer>
      <Tabs.Navigator {...props}>
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
          options={{
            title: 'Second',
            tabBarButtonTestID: 'tab-two',
            lazy: true,
          }}
          listeners={onTabPress ? { tabPress: onTabPress } : undefined}
        />
        <Tabs.Screen name="Three" component={Three} options={{ lazy: false }} />
      </Tabs.Navigator>
    </NavigationContainer>,
  );

it('shows the first tab, and mounts a lazy one once selected', async () => {
  await renderTabs();
  expect(screen.getByText('first screen')).toBeVisible();
  expect(screen.queryByText('second screen')).toBeNull();
  // Not lazy: mounted, but hidden
  expect(
    screen.getByText('third screen', { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(screen.getByTestId('tab-one')).toBeSelected();

  await userEvent.press(screen.getByTestId('tab-two'));
  expect(screen.getByText('second screen')).toBeVisible();
  expect(screen.getByTestId('tab-two')).toBeSelected();
  // A route without a title shows its name.
  expect(screen.getByText('Three')).toBeTruthy();

  await userEvent.press(screen.getByTestId('tab-one'));
  // Kept mounted once shown
  expect(
    screen.getByText('second screen', { includeHiddenElements: true }),
  ).toBeTruthy();
});

it('stays on the tab when a listener prevents the press', async () => {
  await renderTabs({}, e => e.preventDefault());
  await userEvent.press(screen.getByTestId('tab-two'));
  expect(screen.getByTestId('tab-one')).toBeSelected();
});

it('hides the bar', async () => {
  await renderTabs({ tabBarHidden: true });
  expect(screen.queryByTestId('tab-one')).toBeNull();
});

it("draws a tab's Material Symbol from its Android drawable name", () => {
  expect(tabGlyph({ uri: 'tab_notifications_filled' })).toBe(
    String.fromCharCode(0xe7f4),
  );
  expect(tabGlyph({ uri: 'tab_unknown' })).toBe('');
  expect(tabGlyph(undefined)).toBe('');
});
