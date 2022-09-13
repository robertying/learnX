import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {Linking, Platform, StyleSheet, View} from 'react-native';
import {useTheme, Text, IconButton, ProgressBar} from 'react-native-paper';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import {canRenderInMacWebview, needWhiteBackground} from 'helpers/html';
import {downloadFile, openFile, shareFile} from 'helpers/fs';
import {t} from 'helpers/i18n';
import useToast from 'hooks/useToast';
import Skeleton from 'components/Skeleton';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';
import {SplitViewContext} from 'components/SplitView';

const FileDetail: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'FileDetail'>>
> = ({route, navigation}) => {
  const {fileType, disableAnimation} = route.params;

  const theme = useTheme();
  const toast = useToast();
  const {showDetail, showMaster, toggleMaster} = useContext(SplitViewContext);

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
        toast(t('fileDownloadFailed'), 'error');
      }
    },
    [route.params, toast],
  );

  const handleShare = useCallback(async () => {
    await shareFile(route.params);
  }, [route.params]);

  const handleOpen = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await openFile(path, fileType);
      } else {
        await Linking.openURL(path);
      }
    } catch {
      toast(t('openFileFailed'), 'error');
    }
  }, [fileType, path, toast]);

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: t('back'),
      headerRight: () => (
        <View style={Styles.flexRow}>
          {(DeviceInfo.isTablet() || DeviceInfo.isMac()) && (
            <IconButton
              style={Styles.mr0}
              onPress={() => toggleMaster(!showMaster)}
              icon={props => (
                <Icon
                  {...props}
                  name={showMaster ? 'fullscreen' : 'fullscreen-exit'}
                />
              )}
              disabled={!showDetail}
            />
          )}
          <IconButton
            style={Styles.mr0}
            onPress={() => handleDownload(true)}
            icon={props => <Icon {...props} name="refresh" />}
          />
          <IconButton
            style={DeviceInfo.isMac() ? Styles.mr0 : {marginRight: -8}}
            disabled={error || !path}
            onPress={handleShare}
            icon={props => <Icon {...props} name="ios-share" />}
          />
          {DeviceInfo.isMac() && (
            <IconButton
              style={{marginRight: -8}}
              disabled={error || !path}
              onPress={handleOpen}
              icon={props => <Icon {...props} name="open-in-new" />}
            />
          )}
        </View>
      ),
    });
  }, [
    error,
    handleDownload,
    handleOpen,
    handleShare,
    navigation,
    path,
    showDetail,
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
            {t('fileDownloadFailed')}
          </Text>
        </View>
      ) : path ? (
        (Platform.OS === 'ios' && !DeviceInfo.isMac()) ||
        (Platform.OS === 'ios' &&
          DeviceInfo.isMac() &&
          canRenderInMacWebview(fileType)) ? (
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
              <IconButton icon="share" size={48} onPress={handleShare} />
              <Text style={Styles.spacey1}>{t('share')}</Text>
            </View>
            <View style={styles.colCenter}>
              <IconButton icon="open-in-new" size={48} onPress={handleOpen} />
              <Text style={Styles.spacey1}>{t('open')}</Text>
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
