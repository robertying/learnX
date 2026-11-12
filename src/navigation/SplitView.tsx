import {
  createContext,
  createRef,
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
  const [showMaster, setShowMaster] = useState(true);
  const masterHidden = showDetail && !showMaster;

  const [selectedTab, setSelectedTab] = useState(initialTab);
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
        toggleMaster: setShowMaster,
        masterWidth: SplitSizes.masterWidth,
        tabs,
      }}
    >
      <View style={styles.root}>
        <View
          testID="split-master"
          style={[
            styles.master,
            { flex: showDetail ? 0 : 1 },
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
        {showDetail && <Divider vertical />}
        <View
          testID="split-detail"
          style={[styles.detail, { display: showDetail ? 'flex' : 'none' }]}
        >
          {loadedTabs.map(tab => (
            <TabLayer key={tab} selected={tab === selectedTab}>
              {renderDetail(tabs.detailRef(tab))}
            </TabLayer>
          ))}
        </View>
      </View>
    </SplitViewContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    flex: 1,
  },
  master: {
    width: SplitSizes.masterWidth,
    zIndex: 2,
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
