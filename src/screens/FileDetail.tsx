import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {Linking, Platform, StyleSheet, View} from 'react-native';
import {useTheme, Text, ProgressBar, IconButton} from 'react-native-paper';
import {StackScreenProps} from '@react-navigation/stack';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import {needWhiteBackground} from 'helpers/html';
import {downloadFile, openFile, shareFile} from 'helpers/fs';
import useToast from 'hooks/useToast';
import Skeleton from 'components/Skeleton';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';
import {SplitViewContext} from 'components/SplitView';

const FileDetail: React.FC<StackScreenProps<ScreenParams, 'FileDetail'>> = ({
  route,
  navigation,
}) => {
  const {fileType, disableAnimation} = route.params;

  const theme = useTheme();
  const toast = useToast();
  const {showMaster, toggleMaster} = useContext(SplitViewContext);

  const webViewRef = useRef<WebView>(null);

  const [path, setPath] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  const handleDownload = useCallback(
    async (refresh: boolean) => {
      setPath('');
      setError(false);
      try {
        const path = await downloadFile(route.params, refresh, setProgress);
        setPath(path);
        setProgress(0);
      } catch (e) {
        setError(true);
        toast('文件下载失败', 'error');
      }
    },
    [route.params, toast],
  );

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animationEnabled: false,
      });
    }
  }, [navigation, disableAnimation]);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: '返回',
      headerRight: () => (
        <View style={Styles.flexRow}>
          {(DeviceInfo.isTablet() || DeviceInfo.isMac()) && (
            <IconButton
              style={Styles.mr0}
              onPress={() => toggleMaster(!showMaster)}
              icon={(props) => (
                <Icon
                  {...props}
                  name={showMaster ? 'fullscreen' : 'fullscreen-exit'}
                />
              )}
            />
          )}
          <IconButton
            style={Styles.mr0}
            onPress={() => handleDownload(true)}
            icon={(props) => <Icon {...props} name="refresh" />}
          />
          <IconButton
            style={DeviceInfo.isMac() ? Styles.mr0 : undefined}
            disabled={error || !path}
            onPress={() => shareFile(route.params)}
            icon={(props) => <Icon {...props} name="ios-share" />}
          />
          {DeviceInfo.isMac() && (
            <IconButton
              disabled={error || !path}
              onPress={() => Linking.openURL(path)}
              icon={(props) => <Icon {...props} name="open-in-new" />}
            />
          )}
        </View>
      ),
    });
  }, [
    error,
    handleDownload,
    navigation,
    path,
    route.params,
    showMaster,
    toggleMaster,
  ]);

  useEffect(() => {
    handleDownload(false);
  }, [handleDownload]);

  return (
    <SafeArea>
      {error ? (
        <View style={styles.errorRoot}>
          <Icon
            style={Styles.spacey1}
            name="error"
            color={theme.colors.placeholder}
            size={56}
          />
          <Text style={[Styles.spacey1, {color: theme.colors.placeholder}]}>
            文件下载失败，请重试
          </Text>
        </View>
      ) : path ? (
        Platform.OS === 'ios' ? (
          <WebView
            ref={webViewRef}
            style={{
              backgroundColor: needWhiteBackground(fileType)
                ? 'white'
                : 'transparent',
            }}
            source={{
              uri: path,
            }}
            originWhitelist={['*']}
            decelerationRate="normal"
          />
        ) : (
          <View style={styles.actions}>
            <View style={styles.colCenter}>
              <IconButton
                icon="share"
                size={48}
                onPress={() => shareFile(route.params)}
              />
              <Text style={Styles.spacey1}>分享</Text>
            </View>
            <View style={styles.colCenter}>
              <IconButton
                icon="open-in-new"
                size={48}
                onPress={() => openFile(path, fileType)}
              />
              <Text style={Styles.spacey1}>打开</Text>
            </View>
          </View>
        )
      ) : (
        <SafeArea style={styles.skeletons}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </SafeArea>
      )}
      {progress ? (
        <ProgressBar style={styles.progressBar} progress={progress} />
      ) : undefined}
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  skeletons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colCenter: {
    alignItems: 'center',
  },
});

export default FileDetail;
