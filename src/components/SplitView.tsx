import { createContext, useState, Children, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { NavigationContainerRef } from '@react-navigation/native';
import { BlurTargetView, BlurView } from 'expo-blur';
import Numbers from 'constants/Numbers';

const SplitViewContext = createContext<{
  detailNavigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null> | null;
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
  detailNavigationContainerRef: React.RefObject<NavigationContainerRef<{}> | null> | null;
  showDetail: boolean;
}

const SplitViewProvider: React.FC<React.PropsWithChildren<SplitViewProps>> = ({
  splitEnabled,
  detailNavigationContainerRef,
  showDetail,
  children,
}) => {
  const rendered = useRef(false);
  const blurTargetRef = useRef<View | null>(null);

  const [showMaster, setShowMaster] = useState(true);
  const [blur, setBlur] = useState(false);

  useEffect(() => {
    if (rendered.current) {
      setBlur(true);
      setTimeout(() => {
        setBlur(false);
      }, 500);
    } else {
      rendered.current = true;
    }
  }, [showDetail, splitEnabled]);

  return (
    <SplitViewContext.Provider
      value={{
        detailNavigationContainerRef,
        showDetail,
        showMaster,
        toggleMaster: setShowMaster,
      }}
    >
      {splitEnabled ? (
        <BlurTargetView ref={blurTargetRef} style={styles.root}>
          <View
            testID="rns-split-master"
            style={[
              styles.master,
              {
                flex: showDetail ? 0 : 1,
                display: showMaster ? 'flex' : 'none',
              },
            ]}
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
        </BlurTargetView>
      ) : (
        <>{Children.toArray(children)[0]}</>
      )}
      {blur && (
        <BlurView
          blurTarget={blurTargetRef}
          intensity={25}
          style={styles.blurView}
          blurMethod="dimezisBlurViewSdk31Plus"
        />
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
  detail: {
    flex: 1,
    zIndex: 1,
  },
  divider: {
    height: '100%',
    width: 1,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
});

export { SplitViewContext, SplitViewProvider };
