import {createContext, useState, Children} from 'react';
import {StyleSheet, View} from 'react-native';
import {Divider} from 'react-native-paper';
import {NavigationContainerRef} from '@react-navigation/native';

const SplitViewContext = createContext<{
  detailNavigationContainerRef: React.RefObject<
    NavigationContainerRef<{}>
  > | null;
  showDetail: boolean;
  showMaster: boolean;
  toggleMaster: (show: boolean) => void;
}>({
  detailNavigationContainerRef: null,
  showDetail: false,
  showMaster: true,
  toggleMaster: () => {},
});

export interface SplitViewProps {
  splitEnabled: boolean;
  detailNavigationContainerRef: React.RefObject<
    NavigationContainerRef<{}>
  > | null;
  showDetail: boolean;
}

const SplitViewProvider: React.FC<React.PropsWithChildren<SplitViewProps>> = ({
  splitEnabled,
  detailNavigationContainerRef,
  showDetail,
  children,
}) => {
  const [showMaster, setShowMaster] = useState(true);

  return (
    <SplitViewContext.Provider
      value={{
        detailNavigationContainerRef,
        showDetail,
        showMaster,
        toggleMaster: setShowMaster,
      }}>
      {splitEnabled ? (
        <View style={styles.root}>
          <View
            style={[
              styles.master,
              {flex: showDetail ? 0 : 1, display: showMaster ? 'flex' : 'none'},
            ]}>
            {Children.toArray(children)[0]}
          </View>
          {showDetail && <Divider style={styles.divider} />}
          <View
            style={[styles.detail, {display: showDetail ? 'flex' : 'none'}]}>
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
    width: 320,
    zIndex: 2,
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

export {SplitViewContext, SplitViewProvider};
