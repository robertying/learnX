import { createContext, useState, Children } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DetailNavigationContainerRef } from 'screens/types';
import Numbers from 'constants/Numbers';
import Divider from 'components/Divider';

const SplitViewContext = createContext<{
  detailNavigationContainerRef: DetailNavigationContainerRef | null;
  splitEnabled: boolean;
  showDetail: boolean;
  showMaster: boolean;
  toggleMaster: (show: boolean) => void;
  /** Width of the master pane beside the detail one. */
  masterWidth: number;
}>({
  detailNavigationContainerRef: null,
  splitEnabled: false,
  showDetail: false,
  showMaster: true,
  toggleMaster: () => {},
  masterWidth: Numbers.splitViewMasterWidth,
});

export interface SplitViewProps {
  detailNavigationContainerRef: DetailNavigationContainerRef | null;
  showDetail: boolean;
}

/**
 * Android's split view, drawn in JS: the list beside the detail pane once the
 * window is wide enough (`showDetail`), the list alone otherwise. iOS, iPadOS
 * and Mac lay out theirs natively (`NativeSplitView`).
 */
const SplitViewProvider: React.FC<React.PropsWithChildren<SplitViewProps>> = ({
  detailNavigationContainerRef,
  showDetail,
  children,
}) => {
  const [showMaster, setShowMaster] = useState(true);
  const masterHidden = showDetail && !showMaster;

  return (
    <SplitViewContext.Provider
      value={{
        detailNavigationContainerRef,
        splitEnabled: showDetail,
        showDetail,
        showMaster,
        toggleMaster: setShowMaster,
        masterWidth: Numbers.splitViewMasterWidth,
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
          {Children.toArray(children)[0]}
        </View>
        {showDetail && <Divider vertical />}
        <View
          testID="split-detail"
          style={[styles.detail, { display: showDetail ? 'flex' : 'none' }]}
        >
          {Children.toArray(children)[1]}
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
    width: Numbers.splitViewMasterWidth,
    zIndex: 2,
  },
  masterHidden: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -Numbers.splitViewMasterWidth,
  },
  detail: {
    flex: 1,
    zIndex: 1,
  },
});

export { SplitViewContext, SplitViewProvider };
