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
import useInert from 'hooks/useInert';
import { saveMasterWidth, savedMasterWidth } from './paneLayout';
import { useRootNavigation } from './rootNavigation';
import SplitDivider from './SplitDivider';
import useBackKeys from './useBackKeys';

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
   * The JS split of Android and the Electron app, which holds all the tabs:
   * each tab's detail container, and showing it as the tab is selected
   * (`SplitTab`).
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
> = ({ selected, children }) => {
  const layer = useInert(!selected);
  return (
    <View
      ref={layer}
      style={[StyleSheet.absoluteFill, !selected && styles.hiddenLayer]}
      pointerEvents={selected ? 'auto' : 'none'}
      accessibilityElementsHidden={!selected}
      importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
};

/**
 * A tab inside the JS split (`SplitViewProvider`): its lists open items in
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
 * The split view of Android and the Electron app, drawn in JS: the list
 * beside the detail pane once the window is wide enough (`showDetail`), the
 * list alone otherwise. iOS, iPadOS and Mac lay out theirs natively
 * (`NativeSplitView`). It holds the whole main UI, tab bar and sheets
 * included, and the pane shows the detail stack of the selected tab
 * (`SplitTab`); screens outside the tabs use that one.
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
  // The list column's width: the user's (in the Electron app, which drags
  // it), narrowed while the window leaves the detail column too little room.
  const [chosenWidth, setChosenWidth] = useState(
    () => savedMasterWidth() ?? SplitSizes.masterWidth,
  );
  const [rootWidth, setRootWidth] = useState<number | null>(null);
  const maxMasterWidth = Math.max(
    SplitSizes.minMasterWidth,
    Math.min(
      SplitSizes.maxMasterWidth,
      rootWidth === null
        ? Infinity
        : rootWidth - SplitSizes.minDetailWidth - DIVIDER_WIDTH,
    ),
  );
  const masterWidth = Math.max(
    SplitSizes.minMasterWidth,
    Math.min(chosenWidth, maxMasterWidth),
  );
  const showMaster = !fullScreenTabs.has(selectedTab);
  const masterHidden = showDetail && !showMaster;
  // The hidden list is only moved off the window's edge.
  const master = useInert(masterHidden);
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

  // The Electron app's back keys: the sheets, then this pane, then the list.
  useBackKeys(
    useRootNavigation(),
    showDetail ? tabs.detailRef(selectedTab) : null,
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
        masterWidth,
        tabs,
      }}
    >
      <View
        style={styles.root}
        onLayout={event => setRootWidth(event.nativeEvent.layout.width)}
      >
        <View
          ref={master}
          testID="split-master"
          style={[
            styles.master,
            { width: masterWidth },
            // Its own width beside the detail. (Not `flex: 0`, which React
            // Native Web reads as a zero basis.)
            showDetail ? styles.masterBeside : styles.masterAlone,
            // Not `display: 'none'`: Fabric doesn't mount the children of hidden views, so
            // every toggle would destroy and recreate the whole master pane natively.
            masterHidden && [styles.masterHidden, { left: -masterWidth }],
          ]}
          pointerEvents={masterHidden ? 'none' : 'auto'}
          accessibilityElementsHidden={masterHidden}
          importantForAccessibility={
            masterHidden ? 'no-hide-descendants' : 'auto'
          }
        >
          {children}
        </View>
        {showDetail && !masterHidden && (
          <SplitDivider
            width={masterWidth}
            min={SplitSizes.minMasterWidth}
            max={maxMasterWidth}
            defaultWidth={SplitSizes.masterWidth}
            onResize={setChosenWidth}
            onResizeEnd={saveMasterWidth}
          />
        )}
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

const DIVIDER_WIDTH = 1;

const styles = StyleSheet.create({
  // Clips the hidden master pane, which sits off its leading edge: in the
  // Electron app the navigation pane is there, not the window's edge.
  root: {
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  master: {
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
