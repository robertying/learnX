import { useContext } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { act, render, screen } from '@testing-library/react-native';
import createSidebarSplitNavigator from 'navigation/SidebarSplitNavigator';
import { SplitViewContext } from 'navigation/SplitView';

let mockSidebar: Record<string, any> = {};
jest.mock('modules/sidebar', () => ({
  SidebarView: (props: object) => {
    mockSidebar = props;
    return null;
  },
}));
let mockSplitRef: unknown;
jest.mock('navigation/NativeSplitView', () => {
  const { SplitViewContext: Context } = require('navigation/SplitView');
  return {
    __esModule: true,
    default: ({
      sidebar,
      children,
      detailNavigationContainerRef,
    }: {
      sidebar: React.ReactNode;
      children: React.ReactNode;
      detailNavigationContainerRef: unknown;
    }) => {
      mockSplitRef = detailNavigationContainerRef;
      return (
        <Context.Provider
          value={{
            detailNavigationContainerRef,
            showDetail: true,
            laidOut: true,
            showMaster: true,
            toggleMaster: () => {},
            masterWidth: 320,
          }}
        >
          {sidebar}
          {children}
        </Context.Provider>
      );
    },
  };
});

type Params = { First: undefined; Second: undefined; Third: undefined };
const Sidebar = createSidebarSplitNavigator<Params>();

const seenRef = jest.fn<void, [string, unknown]>();
/** The detail container each tab was last given, by its name. */
const detailRefs = () =>
  Object.fromEntries(seenRef.mock.calls) as Record<string, unknown>;
const Tab = ({ name }: { name: string }) => {
  seenRef(name, useContext(SplitViewContext).detailNavigationContainerRef);
  return <Text>{name}</Text>;
};
const First = () => <Tab name="First" />;
const Second = () => <Tab name="Second" />;
const Third = () => <Tab name="Third" />;

const renderDetail = jest.fn<React.ReactNode, [unknown]>(() => (
  <Text>detail</Text>
));

const renderNavigator = () =>
  render(
    <NavigationContainer>
      <Sidebar.Navigator renderDetail={renderDetail as never}>
        <Sidebar.Screen
          name="First"
          component={First}
          options={{ title: 'One', sfSymbol: 'sun.max', testID: 'tab-one' }}
        />
        <Sidebar.Screen
          name="Second"
          component={Second}
          options={{ title: 'Two', sfSymbol: 'bell', badge: true }}
        />
        <Sidebar.Screen
          name="Third"
          component={Third}
          options={{ title: 'Three', sfSymbol: 'doc', lazy: true }}
        />
      </Sidebar.Navigator>
    </NavigationContainer>,
  );

const select = (key: string) =>
  act(() => mockSidebar.onSelect({ nativeEvent: { key } }));

it('lists the tabs in the sidebar, with their symbols, badges and test ids', async () => {
  await renderNavigator();
  expect(mockSidebar.items).toStrictEqual([
    {
      key: 'First',
      title: 'One',
      systemImage: 'sun.max',
      badge: false,
      testID: 'tab-one',
    },
    {
      key: 'Second',
      title: 'Two',
      systemImage: 'bell',
      badge: true,
      testID: undefined,
    },
    {
      key: 'Third',
      title: 'Three',
      systemImage: 'doc',
      badge: false,
      testID: undefined,
    },
  ]);
  expect(mockSidebar.selectedKey).toBe('First');
});

const hidden = { includeHiddenElements: true };

it('mounts lazy tabs once selected, keeping the others mounted but hidden', async () => {
  await renderNavigator();
  expect(screen.getByText('First')).toBeTruthy();
  expect(screen.queryByText('Second')).toBeNull();
  expect(screen.getByText('Second', hidden)).toBeTruthy();
  expect(screen.queryByText('Third', hidden)).toBeNull();

  await select('Third');
  expect(mockSidebar.selectedKey).toBe('Third');
  expect(screen.getByText('Third')).toBeTruthy();
  expect(screen.queryByText('First')).toBeNull();
  expect(screen.getByText('First', hidden)).toBeTruthy();
});

it('gives each tab a detail container of its own, which the split shows for the selected one', async () => {
  await renderNavigator();
  const refs = new Set(renderDetail.mock.calls.map(([ref]) => ref));
  expect(refs.size).toBe(2);
  expect(detailRefs().First).not.toBe(detailRefs().Second);
  expect(refs).toEqual(new Set([detailRefs().First, detailRefs().Second]));
  expect(mockSplitRef).toBe(detailRefs().First);

  await select('Second');
  expect(mockSplitRef).toBe(detailRefs().Second);
});
