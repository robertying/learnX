import { createContext, useState, Children } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { NavigationContainerRef } from '@react-navigation/native';
import Numbers from 'constants/Numbers';

const SplitViewContext = createContext<{
  detailNavigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null> | null;
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
  splitEnabled: boolean;
  detailNavigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null> | null;
  showDetail: boolean;
}

const SplitViewProvider: React.FC<React.PropsWithChildren<SplitViewProps>> = ({
  splitEnabled,
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
        splitEnabled,
        showDetail,
        showMaster,
        toggleMaster: setShowMaster,
        masterWidth: Numbers.splitViewMasterWidth,
      }}
    >
      {splitEnabled ? (
        <View style={styles.root}>
          <View
            testID="rns-split-master"
            style={[
              styles.master,
              { flex: showDetail ? 0 : 1 },
              // Not `display: 'none'`: Fabric doesn't mount the children of hidden views, so
              // every toggle would destroy and recreate the whole master pane natively. On Mac
              // Catalyst, the orphaned tab bar controller then keeps the window toolbar's tabs.
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
          {showDetail && <Divider style={styles.divider} />}
          <View
            testID="rns-split-detail"
            style={[styles.detail, { display: showDetail ? 'flex' : 'none' }]}
          >
            {Children.toArray(children)[1]}
          </View>
        </View>
      ) : (
        <>{Children.toArray(children)[0]}</>
      )}
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
  divider: {
    height: '100%',
    width: 1,
  },
});

export { SplitViewContext, SplitViewProvider };
