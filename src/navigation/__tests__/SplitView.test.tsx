import { useContext } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SplitTab,
  SplitViewContext,
  SplitViewProvider,
} from 'navigation/SplitView';
import type { DetailNavigationContainerRef } from 'navigation/types';

const seenContext = jest.fn<
  void,
  [React.ContextType<typeof SplitViewContext>]
>();
const context = () => seenContext.mock.lastCall![0];
const Master = () => {
  seenContext(useContext(SplitViewContext));
  return <Text>master</Text>;
};

// Each tab's detail stack, named by the order its ref was handed out in.
const detailRefs: DetailNavigationContainerRef[] = [];
const renderDetail = (ref: DetailNavigationContainerRef) => {
  if (!detailRefs.includes(ref)) {
    detailRefs.push(ref);
  }
  return <Text>{`detail ${detailRefs.indexOf(ref)}`}</Text>;
};
beforeEach(() => {
  detailRefs.length = 0;
});

const renderSplit = (showDetail: boolean, children = <Master />) =>
  render(
    <SplitViewProvider
      showDetail={showDetail}
      initialTab="A"
      renderDetail={renderDetail}
    >
      {children}
    </SplitViewProvider>,
  );

it('shows the list alone in a narrow window', async () => {
  await renderSplit(false);
  expect(screen.getByTestId('split-master')).toHaveStyle({ flex: 1 });
  expect(
    screen.getByTestId('split-detail', { includeHiddenElements: true }),
  ).toHaveStyle({ display: 'none' });
  expect(screen.queryByTestId('divider')).toBeNull();
  expect(context()).toMatchObject({
    showDetail: false,
    showMaster: true,
    masterWidth: 320,
    detailNavigationContainerRef: null,
  });
  // Hiding the list does nothing without a detail pane beside it.
  await act(() => context().toggleMaster(false));
  expect(screen.getByText('master')).toBeTruthy();
});

it('puts the detail beside the list in a wide window, and can hide the list', async () => {
  await renderSplit(true);
  expect(screen.getByTestId('split-master')).toHaveStyle({
    flex: 0,
    width: 320,
  });
  expect(
    screen.getByTestId('split-detail', { includeHiddenElements: true }),
  ).toHaveStyle({ display: 'flex' });
  expect(context().showDetail).toBe(true);
  expect(context().detailNavigationContainerRef).toBe(detailRefs[0]);

  await act(() => context().toggleMaster(false));
  expect(context().showMaster).toBe(false);
  // Still mounted, but moved off screen and out of reach.
  const master = screen.getByTestId('split-master', {
    includeHiddenElements: true,
  });
  expect(master).toHaveStyle({ position: 'absolute', left: -320 });
  expect(master.props.pointerEvents).toBe('none');
  expect(screen.queryByText('master')).toBeNull();

  await act(() => context().toggleMaster(true));
  expect(screen.getByText('master')).toBeTruthy();
});

describe('tabs', () => {
  const Tabs = createNativeStackNavigator();
  const seenTab = jest.fn<
    void,
    [string, React.ContextType<typeof SplitViewContext>]
  >();
  const tabContext = (name: string) =>
    seenTab.mock.calls.findLast(([tab]) => tab === name)![1];
  const Tab = ({ name }: { name: string }) => {
    seenTab(name, useContext(SplitViewContext));
    const navigation = useNavigation<{ navigate: (name: string) => void }>();
    return (
      <Text onPress={() => navigation.navigate(name === 'A' ? 'B' : 'A')}>
        {`go from ${name}`}
      </Text>
    );
  };
  const tab = (name: string) => () => (
    <SplitTab name={name}>
      <Tab name={name} />
    </SplitTab>
  );
  const TabA = tab('A');
  const TabB = tab('B');

  it("shows the selected tab's own detail stack, and keeps the others", async () => {
    await renderSplit(
      true,
      <>
        <NavigationContainer>
          <Tabs.Navigator>
            <Tabs.Screen name="A" component={TabA} />
            <Tabs.Screen name="B" component={TabB} />
          </Tabs.Navigator>
        </NavigationContainer>
        <Master />
      </>,
    );
    expect(screen.getByText('detail 0')).toBeTruthy();
    const refA = tabContext('A').detailNavigationContainerRef;
    expect(refA).toBe(detailRefs[0]);

    await act(() => screen.getByText('go from A').props.onPress());
    const refB = tabContext('B').detailNavigationContainerRef;
    expect(refB).not.toBe(refA);
    // A's stays mounted under B's, out of sight and reach.
    expect(
      screen.getByText(`detail ${detailRefs.indexOf(refB!)}`),
    ).toBeTruthy();
    expect(screen.queryByText('detail 0')).toBeNull();
    expect(
      screen.getByText('detail 0', { includeHiddenElements: true }),
    ).toBeTruthy();
    // Each tab keeps its own, and screens outside the tabs get the shown one.
    expect(tabContext('A').detailNavigationContainerRef).toBe(refA);
    expect(context().detailNavigationContainerRef).toBe(refB);
  });

  it('renders a tab as it is outside the split', async () => {
    await render(
      <NavigationContainer>
        <Tabs.Navigator>
          <Tabs.Screen name="A" component={TabA} />
        </Tabs.Navigator>
      </NavigationContainer>,
    );
    expect(tabContext('A').tabs).toBeUndefined();
    expect(tabContext('A').detailNavigationContainerRef).toBeNull();
  });
});
