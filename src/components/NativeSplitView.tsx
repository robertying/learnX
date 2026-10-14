import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
}

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
export const useSplitLaidOut = () => useReportedColumnMetrics(0) !== undefined;

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
> = ({ enabled, detailNavigationContainerRef, children }) => {
  const [master, detail] = Children.toArray(children);

  // UIKit reports the initial collapse, but not an initial expansion.
  const [expanded, setExpanded] = useState(true);
  // Only ever set by the user. UIKit passes through other display modes on its
  // own, e.g. while expanding; were those fed back as the preferred one, the
  // master pane could be left hidden for good.
  const [preferredDisplayMode, setPreferredDisplayMode] =
    useState<SplitDisplayMode>('automatic');
  // What UIKit actually shows, for display only.
  const [displayMode, setDisplayMode] = useState<SplitDisplayMode>();

  const masterWidth = useReportedColumnMetrics(0)?.frame.width;
  const detailWidth = useReportedColumnMetrics(1)?.frame.width;
  const masterAppearance = useColumnAppearance();
  const detailAppearance = useColumnAppearance();

  const showDetail = enabled && expanded;
  const showMaster = displayMode !== 'secondaryOnly';

  const toggleMaster = useCallback((show: boolean) => {
    setPreferredDisplayMode(show ? 'oneBesideSecondary' : 'secondaryOnly');
  }, []);

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
          displayModeButtonVisibility="never"
          topColumnForCollapsing="primary"
          // Compared with the split's bounds natively, so that it can't lag
          // behind a resize (or the hinge, which is handled natively too).
          maxCollapsedWidth={Numbers.splitViewMaxCollapsedWidth}
          onCollapse={() => setExpanded(false)}
          onExpand={() => setExpanded(true)}
          onDisplayModeWillChange={e =>
            setDisplayMode(e.nativeEvent.nextDisplayMode as SplitDisplayMode)
          }
        >
          {/* The secondary column extends underneath the primary one (and any
              vertical bar); UIKit reports both as safe area insets of the column. */}
          <Split.Column
            style={{ width: masterWidth }}
            {...masterAppearance.handlers}
          >
            <SafeAreaProvider>
              <ColumnSafeArea column={0} appearance={masterAppearance}>
                {master}
              </ColumnSafeArea>
            </SafeAreaProvider>
          </Split.Column>
          <Split.Column
            style={{ width: detailWidth }}
            {...detailAppearance.handlers}
          >
            <SafeAreaProvider>
              <ColumnSafeArea column={1} appearance={detailAppearance}>
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
