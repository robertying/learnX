import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { Split } from 'react-native-screens/experimental';
import type { SplitDisplayMode } from 'react-native-screens/experimental';
import Numbers from 'constants/Numbers';
import { SplitViewContext } from './SplitView';

export interface NativeSplitViewProps {
  /** Without the split, only the first child is rendered. */
  enabled: boolean;
  detailNavigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null>;
  /**
   * Shown in a column of its own before the master one, which makes it the
   * system's sidebar. The split then only collapses in compact width.
   */
  sidebar?: React.ReactNode;
}

// Indices into the column metrics, which don't follow the columns' order: the
// sidebar comes first where there is one.
const masterColumn = 0;
const detailColumn = 1;
const sidebarColumn = 2;

const displayModesWithSidebar: SplitDisplayMode[] = [
  'twoBesideSecondary',
  'twoOverSecondary',
  'twoDisplaceSecondary',
];

// UIKit only sizes the columns and reports their safe areas once the split is in
// the window, which a tab that hasn't been opened yet isn't. All the splits are
// laid out alike, so until then a column goes by what the one on screen reports.
const reportedColumnMetrics: (Metrics | undefined)[] = [];
const columnMetricsListeners = new Set<() => void>();

const subscribeToColumnMetrics = (listener: () => void) => {
  columnMetricsListeners.add(listener);
  return () => {
    columnMetricsListeners.delete(listener);
  };
};

const useReportedColumnMetrics = (column: number) =>
  useSyncExternalStore(
    subscribeToColumnMetrics,
    () => reportedColumnMetrics[column],
  );

// Off screen, a column's safe area provider still reports, with insets that
// aren't the column's.
const useColumnAppearance = () => {
  const onScreen = useRef(false);
  const [appearances, setAppearances] = useState(0);

  const handlers = useMemo(
    () => ({
      onWillAppear: () => {
        onScreen.current = true;
      },
      onDidAppear: () => setAppearances(count => count + 1),
      onDidDisappear: () => {
        onScreen.current = false;
      },
    }),
    [],
  );

  return { onScreen, appearances, handlers };
};

// Whether a split has been on screen, for new ones to have its layout to go by.
export const useSplitLaidOut = () =>
  useReportedColumnMetrics(masterColumn) !== undefined;

const ColumnSafeArea: React.FC<
  React.PropsWithChildren<{
    column: number;
    appearance: ReturnType<typeof useColumnAppearance>;
  }>
> = ({ column, appearance: { onScreen, appearances }, children }) => {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const [reported, setReported] = useState<Metrics>();
  const shared = useReportedColumnMetrics(column);

  useEffect(() => {
    if (onScreen.current) {
      const metrics = { insets, frame };
      setReported(metrics);
      reportedColumnMetrics[column] = metrics;
      columnMetricsListeners.forEach(listener => listener());
    }
  }, [column, onScreen, appearances, insets, frame]);

  const metrics = reported ?? shared ?? { insets, frame };

  return (
    <SafeAreaInsetsContext.Provider value={metrics.insets}>
      <SafeAreaFrameContext.Provider value={metrics.frame}>
        {children}
      </SafeAreaFrameContext.Provider>
    </SafeAreaInsetsContext.Provider>
  );
};

/**
 * Backed by UISplitViewController, so whether the columns sit side by side,
 * where the hinge falls, and where the bars go are all decided by the system.
 */
const NativeSplitViewProvider: React.FC<
  React.PropsWithChildren<NativeSplitViewProps>
> = ({ enabled, detailNavigationContainerRef, sidebar, children }) => {
  const [master, detail] = Children.toArray(children);

  // UIKit reports the initial collapse, but not an initial expansion.
  const [expanded, setExpanded] = useState(true);
  // Only ever set by the user. UIKit passes through other display modes on its
  // own, e.g. while expanding; were those fed back as the preferred one, the
  // master pane could be left hidden for good.
  // It starts as what UIKit saved with the scene, which it restores without
  // reporting it. Without a sidebar there's no system button to bring a hidden
  // master pane back, so that split starts with it shown instead.
  const [preferredDisplayMode, setPreferredDisplayMode] =
    useState<SplitDisplayMode>(
      sidebar === undefined ? 'oneBesideSecondary' : 'automatic',
    );
  // What UIKit actually shows, for display only.
  const [displayMode, setDisplayMode] = useState<SplitDisplayMode>();

  const masterWidth = useReportedColumnMetrics(masterColumn)?.frame.width;
  const detailWidth = useReportedColumnMetrics(detailColumn)?.frame.width;
  const sidebarWidth = useReportedColumnMetrics(sidebarColumn)?.frame.width;
  const masterAppearance = useColumnAppearance();
  const detailAppearance = useColumnAppearance();
  const sidebarAppearance = useColumnAppearance();

  const hasSidebar = sidebar !== undefined;
  const showDetail = enabled && expanded;
  const showMaster = displayMode !== 'secondaryOnly';
  // Hidden with the system's button. Taken to be shown until UIKit reports a
  // display mode.
  const sidebarHidden =
    hasSidebar &&
    displayMode !== undefined &&
    !displayModesWithSidebar.includes(displayMode);

  // The master pane comes back with the sidebar as it was.
  const sidebarHiddenBeforeMaster = useRef(false);
  const toggleMaster = useCallback(
    (show: boolean) => {
      if (!show) {
        sidebarHiddenBeforeMaster.current = sidebarHidden;
      }
      setPreferredDisplayMode(
        show
          ? hasSidebar && !sidebarHiddenBeforeMaster.current
            ? 'twoBesideSecondary'
            : 'oneBesideSecondary'
          : 'secondaryOnly',
      );
    },
    [hasSidebar, sidebarHidden],
  );

  // A master pane hidden for full screen would be saved with the scene and come
  // back hidden on the next launch, with nothing open to undo it. It's shown
  // while in the background and hidden again on return, which is in time for
  // the save when quitting on Mac (on iPad the save comes first, but that split
  // starts with the master pane shown anyway).
  const fullScreen = preferredDisplayMode === 'secondaryOnly';
  const fullScreenInBackground = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && fullScreen) {
        fullScreenInBackground.current = true;
        toggleMaster(true);
      } else if (state === 'active' && fullScreenInBackground.current) {
        fullScreenInBackground.current = false;
        toggleMaster(false);
      }
    });
    return () => subscription.remove();
  }, [fullScreen, toggleMaster]);

  return (
    <SplitViewContext.Provider
      value={{
        detailNavigationContainerRef: showDetail
          ? detailNavigationContainerRef
          : null,
        splitEnabled: showDetail,
        showDetail,
        showMaster,
        toggleMaster,
        masterWidth: masterWidth ?? Numbers.splitViewMasterWidth,
      }}
    >
      {enabled ? (
        <Split.Host
          preferredDisplayMode={preferredDisplayMode}
          preferredSplitBehavior="tile"
          // In the sidebar's bar, which is in the window's title bar on Mac.
          displayModeButtonVisibility={hasSidebar ? 'automatic' : 'never'}
          primaryBackgroundStyle={hasSidebar ? 'sidebar' : undefined}
          topColumnForCollapsing={hasSidebar ? 'supplementary' : 'primary'}
          // Compared with the split's bounds natively, so that it can't lag
          // behind a resize (or the hinge, which is handled natively too).
          // Collapsed, the sidebar would be out of reach.
          maxCollapsedWidth={
            hasSidebar ? undefined : Numbers.splitViewMaxCollapsedWidth
          }
          onCollapse={() => setExpanded(false)}
          onExpand={() => setExpanded(true)}
          onDisplayModeWillChange={e =>
            setDisplayMode(e.nativeEvent.nextDisplayMode as SplitDisplayMode)
          }
        >
          {/* The secondary column extends underneath the primary one (and any
              vertical bar); UIKit reports both as safe area insets of the column. */}
          {hasSidebar && (
            <Split.Column
              style={{ width: sidebarWidth }}
              {...sidebarAppearance.handlers}
            >
              <SafeAreaProvider>
                <ColumnSafeArea
                  column={sidebarColumn}
                  appearance={sidebarAppearance}
                >
                  {sidebar}
                </ColumnSafeArea>
              </SafeAreaProvider>
            </Split.Column>
          )}
          <Split.Column
            style={{ width: masterWidth }}
            {...masterAppearance.handlers}
          >
            <SafeAreaProvider>
              <ColumnSafeArea
                column={masterColumn}
                appearance={masterAppearance}
              >
                {master}
              </ColumnSafeArea>
            </SafeAreaProvider>
          </Split.Column>
          <Split.Column
            style={{ width: detailWidth }}
            {...detailAppearance.handlers}
          >
            <SafeAreaProvider>
              <ColumnSafeArea
                column={detailColumn}
                appearance={detailAppearance}
              >
                {detail}
              </ColumnSafeArea>
            </SafeAreaProvider>
          </Split.Column>
        </Split.Host>
      ) : (
        master
      )}
    </SplitViewContext.Provider>
  );
};

export default NativeSplitViewProvider;
