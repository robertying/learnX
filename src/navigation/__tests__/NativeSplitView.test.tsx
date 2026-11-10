import { useContext } from 'react';
import { AppState, AppStateStatus, Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { act, render, screen } from '@testing-library/react-native';
import Numbers from 'constants/Numbers';
import NativeSplitViewProvider, {
  useSplitLaidOut,
} from 'navigation/NativeSplitView';
import { SplitViewContext } from 'navigation/SplitView';

let mockHost: Record<string, any> = {};
const mockColumns: Record<string, any>[] = [];
jest.mock('react-native-screens/experimental', () => {
  const { View } = require('react-native');
  return {
    Split: {
      Host: (props: { children: React.ReactNode }) => {
        mockHost = props;
        mockColumns.length = 0;
        return <View testID="split-host">{props.children}</View>;
      },
      Column: (props: { children: React.ReactNode }) => {
        mockColumns.push(props);
        return <View>{props.children}</View>;
      },
    },
  };
});

let appStateListener: (state: AppStateStatus) => void = () => {};
const remove = jest.fn();
beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener;
    return { remove };
  });
});

const seenContext = jest.fn<
  void,
  [React.ContextType<typeof SplitViewContext>]
>();
const context = () => seenContext.mock.lastCall![0];
const Master = () => {
  seenContext(useContext(SplitViewContext));
  return <Text>master</Text>;
};
const Insets = ({ name }: { name: string }) => {
  const insets = useContext(SafeAreaInsetsContext);
  return <Text testID={name}>{`${insets?.top}`}</Text>;
};

const ref = { current: null };
const renderSplit = (
  props: { enabled?: boolean; sidebar?: React.ReactNode } = {},
) =>
  render(
    <NativeSplitViewProvider
      enabled={props.enabled ?? true}
      detailNavigationContainerRef={ref}
      sidebar={props.sidebar}
    >
      <Master />
      <Text>detail</Text>
    </NativeSplitViewProvider>,
  );

const displayMode = (nextDisplayMode: string) =>
  act(() =>
    mockHost.onDisplayModeWillChange({ nativeEvent: { nextDisplayMode } }),
  );

it('shows only the master pane without the split', async () => {
  await renderSplit({ enabled: false });
  expect(screen.queryByTestId('split-host')).toBeNull();
  expect(screen.getByText('master')).toBeTruthy();
  expect(screen.queryByText('detail')).toBeNull();
  expect(context()).toMatchObject({
    detailNavigationContainerRef: null,
    showDetail: false,
    masterWidth: Numbers.splitViewMasterWidth,
  });
});

it('lays the panes side by side until UIKit collapses them', async () => {
  await renderSplit();
  expect(mockHost).toMatchObject({
    preferredDisplayMode: 'oneBesideSecondary',
    displayModeButtonVisibility: 'never',
    topColumnForCollapsing: 'primary',
    maxCollapsedWidth: Numbers.splitViewMaxCollapsedWidth,
  });
  expect(mockColumns).toHaveLength(2);
  expect(context().detailNavigationContainerRef).toBe(ref);
  expect(context().showDetail).toBe(true);

  await act(() => mockHost.onCollapse());
  expect(context().showDetail).toBe(false);
  expect(context().detailNavigationContainerRef).toBeNull();
  await act(() => mockHost.onExpand());
  expect(context().showDetail).toBe(true);
});

it('hides the master pane for full screen and brings it back', async () => {
  await renderSplit();
  await act(() => context().toggleMaster(false));
  expect(mockHost.preferredDisplayMode).toBe('secondaryOnly');
  await displayMode('secondaryOnly');
  expect(context().showMaster).toBe(false);
  // Hidden by the user, so it stays hidden.
  expect(mockHost.preferredDisplayMode).toBe('secondaryOnly');

  await act(() => context().toggleMaster(true));
  expect(mockHost.preferredDisplayMode).toBe('oneBesideSecondary');
});

it('shows a master pane restored hidden from a previous session', async () => {
  await renderSplit();
  await displayMode('secondaryOnly');
  expect(mockHost.preferredDisplayMode).toBe('oneBesideSecondary');
});

it('shows a full screen master pane while in the background, so it is not saved hidden', async () => {
  await renderSplit();
  await act(() => context().toggleMaster(false));
  await act(() => appStateListener('background'));
  expect(mockHost.preferredDisplayMode).toBe('oneBesideSecondary');
  await act(() => appStateListener('active'));
  expect(mockHost.preferredDisplayMode).toBe('secondaryOnly');
  // Only a return from the background hides it again.
  await act(() => context().toggleMaster(true));
  await act(() => appStateListener('active'));
  expect(mockHost.preferredDisplayMode).toBe('oneBesideSecondary');
});

describe('with a sidebar', () => {
  it('lets the system show and hide the sidebar, in its own column', async () => {
    await renderSplit({ sidebar: <Text>sidebar</Text> });
    expect(screen.getByText('sidebar')).toBeTruthy();
    expect(mockColumns).toHaveLength(3);
    expect(mockHost).toMatchObject({
      preferredDisplayMode: 'automatic',
      displayModeButtonVisibility: 'automatic',
      primaryBackgroundStyle: 'sidebar',
      topColumnForCollapsing: 'supplementary',
      maxCollapsedWidth: undefined,
      columnMetrics: {
        minimumSecondaryColumnWidth: Numbers.splitViewMinDetailWidth,
      },
    });
  });

  it('brings the master pane back with the sidebar as it was', async () => {
    await renderSplit({ sidebar: <Text>sidebar</Text> });
    await act(() => context().toggleMaster(false));
    await act(() => context().toggleMaster(true));
    expect(mockHost.preferredDisplayMode).toBe('twoBesideSecondary');

    await displayMode('oneBesideSecondary');
    await act(() => context().toggleMaster(false));
    await act(() => context().toggleMaster(true));
    expect(mockHost.preferredDisplayMode).toBe('oneBesideSecondary');

    await displayMode('secondaryOnly');
    expect(mockHost.preferredDisplayMode).toBe('twoBesideSecondary');
  });
});

it('gives each column the safe area it reports on screen, and splits not yet laid out the same', async () => {
  const seenLaidOut = jest.fn<void, [boolean]>();
  const laidOut = () => seenLaidOut.mock.lastCall![0];
  const LaidOut = () => {
    seenLaidOut(useSplitLaidOut());
    return null;
  };
  await render(
    <>
      <LaidOut />
      <NativeSplitViewProvider enabled detailNavigationContainerRef={ref}>
        <Insets name="master-insets" />
        <Insets name="detail-insets" />
      </NativeSplitViewProvider>
    </>,
  );
  expect(laidOut()).toBe(false);
  const [master, detail] = mockColumns;
  await act(() => master.onDidAppear());
  await act(() => detail.onDidAppear());
  expect(laidOut()).toBe(true);
  expect(screen.getByTestId('master-insets')).toHaveTextContent('0');

  await act(() => master.onDidDisappear());
  expect(screen.getByTestId('master-insets')).toHaveTextContent('0');
});
