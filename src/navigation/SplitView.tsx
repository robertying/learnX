import {
  createContext,
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useIsFocused,
  type NavigationContainerRef,
} from '@react-navigation/native';
import type { DetailNavigationContainerRef, DetailStackParams } from './types';
import SplitSizes from 'constants/SplitSizes';
import Divider from 'components/Divider';

const SplitViewContext = createContext<{
  detailNavigationContainerRef: DetailNavigationContainerRef | null;
  showDetail: boolean;
  /**
   * Whether the split knows its layout, so that `showDetail` says whether
   * the detail pane is on screen. A native split only knows once UIKit has
   * put it in the window (and collapsed it, where it's too narrow).
   */
  laidOut: boolean;
  showMaster: boolean;
  toggleMaster: (show: boolean) => void;
  /** Width of the master pane beside the detail one. */
  masterWidth: number;
  /**
   * Android's split, which holds all the tabs: each tab's detail container,
   * and showing it as the tab is selected (`SplitTab`).
   */
  tabs?: {
    detailRef: (tab: string) => DetailNavigationContainerRef;
    select: (tab: string) => void;
  };
}>({
  detailNavigationContainerRef: null,
  showDetail: false,
  laidOut: true,
  showMaster: true,
  toggleMaster: () => {},
  masterWidth: SplitSizes.masterWidth,
});

/** Points a tab's master and detail stacks at its own detail container. */
export const TabSplitContext: React.FC<
  React.PropsWithChildren<{
    detailNavigationContainerRef: DetailNavigationContainerRef;
  }>
> = ({ detailNavigationContainerRef, children }) => {
  const context = useContext(SplitViewContext);
  const value = useMemo(
    () => ({
      ...context,
      detailNavigationContainerRef: context.detailNavigationContainerRef
        ? detailNavigationContainerRef
        : null,
    }),
    [context, detailNavigationContainerRef],
  );

  return (
    <SplitViewContext.Provider value={value}>
      {children}
    </SplitViewContext.Provider>
  );
};

/**
 * A tab's own layer of the pane, stacked with the other tabs'. Tabs that
 * aren't selected stay mounted, natively too, so that they keep their
 * navigation state and don't have to be laid out again. Fabric doesn't mount
 * the children of views with `display: 'none'`.
 */
export const TabLayer: React.FC<
  React.PropsWithChildren<{ selected: boolean }>
> = ({ selected, children }) => (
  <View
    style={[StyleSheet.absoluteFill, !selected && styles.hiddenLayer]}
    pointerEvents={selected ? 'auto' : 'none'}
    accessibilityElementsHidden={!selected}
    importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
  >
    {children}
  </View>
);

/**
 * A tab inside Android's split (`SplitViewProvider`): its lists open items in
 * the tab's own detail stack, which the detail pane shows while the tab is
 * selected. Elsewhere it renders its children as they are.
 */
export const SplitTab: React.FC<React.PropsWithChildren<{ name: string }>> = ({
  name,
  children,
}) => {
  const { tabs } = useContext(SplitViewContext);
  const focused = useIsFocused();
  const select = tabs?.select;

  useEffect(() => {
    if (focused) {
      select?.(name);
    }
  }, [focused, name, select]);

  return tabs ? (
    <TabSplitContext detailNavigationContainerRef={tabs.detailRef(name)}>
      {children}
    </TabSplitContext>
  ) : (
    children
  );
};

/**
 * A tab's detail stack: its screens toggle that tab's own full screen, even
 * while another tab is selected (e.g. a File detail closed as its tab's
 * stack is reset), and read that tab's.
 */
const TabFullScreen: React.FC<
  React.PropsWithChildren<{
    tab: string;
    fullScreen: boolean;
    toggleTabMaster: (tab: string, show: boolean) => void;
  }>
> = ({ tab, fullScreen, toggleTabMaster, children }) => {
  const context = useContext(SplitViewContext);
  const value = useMemo(
    () => ({
      ...context,
      showMaster: !fullScreen,
      toggleMaster: (show: boolean) => toggleTabMaster(tab, show),
    }),
    [context, fullScreen, tab, toggleTabMaster],
  );

  return (
    <SplitViewContext.Provider value={value}>
      {children}
    </SplitViewContext.Provider>
  );
};

export interface SplitViewProps {
  showDetail: boolean;
  /** The tab shown first, whose detail stack is there from the start. */
  initialTab: string;
  /** A detail stack, in the container of `ref`; each tab has its own. */
  renderDetail: (ref: DetailNavigationContainerRef) => React.ReactNode;
}

/**
 * Android's split view, drawn in JS: the list beside the detail pane once the
 * window is wide enough (`showDetail`), the list alone otherwise. iOS, iPadOS
 * and Mac lay out theirs natively (`NativeSplitView`). It holds the whole
 * main UI, tab bar and sheets included, and the pane shows the detail stack
 * of the selected tab (`SplitTab`); screens outside the tabs use that one.
 */
const SplitViewProvider: React.FC<React.PropsWithChildren<SplitViewProps>> = ({
  showDetail,
  initialTab,
  renderDetail,
  children,
}) => {
  const [selectedTab, setSelectedTab] = useState(initialTab);
  // Full screen (the master pane hidden) is each tab's own, as each tab's
  // native split keeps its own on iPad and Mac: the other tabs still show
  // their lists, rather than an empty detail pane with no way to pick one.
  const [fullScreenTabs, setFullScreenTabs] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const showMaster = !fullScreenTabs.has(selectedTab);
  const masterHidden = showDetail && !showMaster;
  const toggleTabMaster = useCallback(
    (tab: string, show: boolean) =>
      setFullScreenTabs(tabs => {
        if (tabs.has(tab) === !show) {
          return tabs;
        }
        const next = new Set(tabs);
        if (show) {
          next.delete(tab);
        } else {
          next.add(tab);
        }
        return next;
      }),
    [],
  );
  const toggleMaster = useCallback(
    (show: boolean) => toggleTabMaster(selectedTab, show),
    [selectedTab, toggleTabMaster],
  );

  // Each tab's detail stack mounts once the tab is first selected.
  const [loadedTabs, setLoadedTabs] = useState([initialTab]);
  // Created as tabs ask for theirs, and kept for good.
  const [detailRefs] = useState(
    () => new Map<string, DetailNavigationContainerRef>(),
  );
  const tabs = useMemo(
    () => ({
      detailRef: (tab: string) => {
        let ref = detailRefs.get(tab);
        if (!ref) {
          ref = createRef<NavigationContainerRef<DetailStackParams>>();
          detailRefs.set(tab, ref);
        }
        return ref;
      },
      select: (tab: string) => {
        setSelectedTab(tab);
        setLoadedTabs(loaded =>
          loaded.includes(tab) ? loaded : [...loaded, tab],
        );
      },
    }),
    [detailRefs],
  );

  return (
    <SplitViewContext.Provider
      value={{
        detailNavigationContainerRef: showDetail
          ? tabs.detailRef(selectedTab)
          : null,
        showDetail,
        laidOut: true,
        showMaster,
        toggleMaster,
        masterWidth: SplitSizes.masterWidth,
        tabs,
      }}
    >
      <View style={styles.root}>
        <View
          testID="split-master"
          style={[
            styles.master,
            // Its own width beside the detail. (Not `flex: 0`, which React
            // Native Web reads as a zero basis.)
            showDetail ? styles.masterBeside : styles.masterAlone,
            // Not `display: 'none'`: Fabric doesn't mount the children of hidden views, so
            // every toggle would destroy and recreate the whole master pane natively.
            masterHidden && styles.masterHidden,
          ]}
          pointerEvents={masterHidden ? 'none' : 'auto'}
          accessibilityElementsHidden={masterHidden}
          importantForAccessibility={
            masterHidden ? 'no-hide-descendants' : 'auto'
          }
        >
          {children}
        </View>
        {showDetail && !masterHidden && <Divider vertical />}
        <View
          testID="split-detail"
          style={[styles.detail, { display: showDetail ? 'flex' : 'none' }]}
        >
          {loadedTabs.map(tab => (
            <TabLayer key={tab} selected={tab === selectedTab}>
              <TabFullScreen
                tab={tab}
                fullScreen={fullScreenTabs.has(tab)}
                toggleTabMaster={toggleTabMaster}
              >
                {renderDetail(tabs.detailRef(tab))}
              </TabFullScreen>
            </TabLayer>
          ))}
        </View>
      </View>
    </SplitViewContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Clips the hidden master pane, which sits off its leading edge: in the
  // Electron app the navigation pane is there, not the window's edge.
  root: {
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  master: {
    width: SplitSizes.masterWidth,
    zIndex: 2,
  },
  masterBeside: {
    flexGrow: 0,
    flexShrink: 0,
  },
  masterAlone: {
    flex: 1,
  },
  masterHidden: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -SplitSizes.masterWidth,
  },
  detail: {
    flex: 1,
    zIndex: 1,
  },
  hiddenLayer: {
    opacity: 0,
    zIndex: -1,
  },
});

export { SplitViewContext, SplitViewProvider };
