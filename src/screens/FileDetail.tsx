import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import {
  useTheme,
  Text,
  ProgressBar,
  Title,
  Caption,
  Divider,
  Chip,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import Icon from '@react-native-vector-icons/material-icons';
import Pdf from 'react-native-pdf';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import {
  canRenderInIosWebview,
  canRenderInMacWebview,
  needWhiteBackground,
} from 'helpers/html';
import {
  copyFileToMacDownloads,
  downloadFile,
  openFile,
  shareFile,
} from 'helpers/fs';
import { isLocaleChinese, t } from 'helpers/i18n';
import useToast from 'hooks/useToast';
import Skeleton from 'components/Skeleton';
import SafeArea from 'components/SafeArea';
import IconButton from 'components/IconButton';
import ScrollView from 'components/ScrollView';
import { FileStackParams } from './types';
import { SplitViewContext } from 'components/SplitView';
import { useAppSelector } from 'data/store';

type Props = NativeStackScreenProps<FileStackParams, 'FileDetail'>;

const FileDetail: React.FC<Props> = ({ route, navigation }) => {
  const { disableAnimation, ...file } = route.params;

  const theme = useTheme();
  const toast = useToast();
  const { showDetail, showMaster, toggleMaster } = useContext(SplitViewContext);

  const openFileAfterDownload = useAppSelector(
    state => state.settings.openFileAfterDownload,
  );

  const webViewRef = useRef<WebView>(null);

  const [path, setPath] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const canRender =
    path &&
    (file.fileType === 'pdf' ||
      (Platform.OS === 'ios' &&
        !DeviceInfo.isMac() &&
        canRenderInIosWebview(file.fileType)) ||
      (Platform.OS === 'ios' &&
        DeviceInfo.isMac() &&
        canRenderInMacWebview(file.fileType)));

  const handleDownload = useCallback(
    async (refresh: boolean) => {
      setPath('');
      setError(false);
      try {
        const path = await downloadFile(route.params, refresh, setProgress);
        setPath(path);
        setProgress(0);
      } catch {
        setError(true);
        toast(t('fileDownloadFailed'), 'error');
      }
    },
    [route.params, toast],
  );

  const handleShare = useCallback(async () => {
    await shareFile(route.params);
  }, [route.params]);

  const handleCopyToDownloadsFolder = useCallback(async () => {
    try {
      await copyFileToMacDownloads(file, path);
      toast(t('downloadToDownloadsSucceeded'), 'success');
    } catch {
      toast(t('downloadToDownloadsFailed'), 'error');
    }
  }, [path, file, toast]);

  const handleOpen = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await openFile(path, file.fileType);
      } else {
        await Linking.openURL(path);
      }
    } catch {
      toast(t('openFileFailed'), 'error');
    }
  }, [file.fileType, path, toast]);

  const handleShowInfo = useCallback(() => {
    setShowInfo(showInfo => !showInfo);
  }, []);

  useEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible:
        DeviceInfo.isTablet() || DeviceInfo.isMac() ? showMaster : undefined,
      headerRight: () => (
        <View style={[Styles.flexRow, { justifyContent: 'flex-end' }]}>
          {(DeviceInfo.isTablet() || DeviceInfo.isMac()) && (
            <IconButton
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
            onPress={() => handleDownload(true)}
            icon={props => <Icon {...props} name="refresh" />}
          />
          <IconButton
            disabled={error || !path}
            onPress={handleShare}
            icon={props => <Icon {...props} name="ios-share" />}
          />
          {DeviceInfo.isMac() && (
            <IconButton
              disabled={error || !path}
              onPress={handleCopyToDownloadsFolder}
              icon={props => <Icon {...props} name="download" />}
            />
          )}
          {Platform.OS === 'android' && (
            <IconButton
              disabled={error || !path}
              onPress={handleOpen}
              icon={props => <Icon {...props} name="open-in-new" />}
            />
          )}
          {canRender && (
            <IconButton
              disabled={error || !path}
              onPress={handleShowInfo}
              icon={props => (
                <Icon {...props} name={showInfo ? 'preview' : 'info-outline'} />
              )}
            />
          )}
        </View>
      ),
      unstable_headerRightItems: () => [
        ...(DeviceInfo.isTablet() || DeviceInfo.isMac()
          ? [
              {
                type: 'button',
                identifier: 'toggleMaster',
                icon: {
                  type: 'sfSymbol',
                  name: showMaster
                    ? 'arrow.up.left.and.arrow.down.right'
                    : 'arrow.down.right.and.arrow.up.left',
                },
                onPress: () => toggleMaster(!showMaster),
                disabled: !showDetail,
              },
            ]
          : ([] as any)),
        {
          type: 'button',
          identifier: 'refresh',
          icon: {
            type: 'sfSymbol',
            name: 'arrow.clockwise',
          },
          onPress: () => handleDownload(true),
          disabled: !!progress,
        },
        {
          type: 'button',
          identifier: 'share',
          icon: {
            type: 'sfSymbol',
            name: 'square.and.arrow.up',
          },
          onPress: () => handleShare(),
          disabled: error || !path,
        },
        ...(DeviceInfo.isMac()
          ? [
              {
                type: 'button',
                identifier: 'download',
                icon: {
                  type: 'sfSymbol',
                  name: 'arrow.down.to.line',
                },
                onPress: () => handleCopyToDownloadsFolder(),
                disabled: error || !path,
              },
            ]
          : []),
        ...(canRender
          ? [
              {
                type: 'button',
                identifier: 'info',
                icon: {
                  type: 'sfSymbol',
                  name: showInfo ? 'eye' : 'info.circle',
                },
                onPress: () => handleShowInfo(),
                disabled: error || !path,
              },
            ]
          : []),
      ],
    });
  }, [
    canRender,
    error,
    handleDownload,
    handleOpen,
    handleShare,
    handleShowInfo,
    handleCopyToDownloadsFolder,
    navigation,
    path,
    progress,
    showDetail,
    showInfo,
    showMaster,
    toggleMaster,
  ]);

  useEffect(() => {
    handleDownload(false);
  }, [handleDownload]);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      openFileAfterDownload &&
      path &&
      file.fileType !== 'pdf'
    ) {
      handleOpen();
    }
  }, [handleOpen, openFileAfterDownload, path, file.fileType]);

  return (
    <SafeArea>
      {error ? (
        <View style={styles.errorRoot}>
          <Icon
            style={Styles.spacey1}
            name="error"
            color={theme.colors.outline}
            size={56}
          />
          <Text style={[Styles.spacey1, { color: theme.colors.outline }]}>
            {t('fileDownloadFailed')}
          </Text>
        </View>
      ) : !path ? (
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
      ) : !showInfo && canRender ? (
        file.fileType === 'pdf' ? (
          <Pdf style={Styles.flex1} source={{ uri: path }} fitPolicy={0} />
        ) : (
          <WebView
            ref={webViewRef}
            style={{
              backgroundColor: needWhiteBackground(file.fileType)
                ? 'white'
                : 'transparent',
            }}
            source={{
              uri: path,
            }}
            originWhitelist={['*']}
            decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
          />
        )
      ) : (
        <>
          <ScrollView
            contentContainerStyle={
              !canRender ? { paddingBottom: 100 } : undefined
            }
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View style={styles.section}>
              <View style={Styles.flexRowCenter}>
                {file.category?.title && (
                  <Chip compact mode="outlined" style={styles.categoryChip}>
                    {file.category?.title}
                  </Chip>
                )}
              </View>
              <Title>{file.title}</Title>
              <View style={Styles.flexRowCenter}>
                <Caption>{file.courseTeacherName}</Caption>
                <Caption>
                  {dayjs(file.uploadTime).format(
                    isLocaleChinese()
                      ? 'YYYY 年 M 月 D 日 dddd HH:mm'
                      : 'MMM D, YYYY HH:mm',
                  )}
                </Caption>
              </View>
            </View>
            <Divider />
            <View style={[styles.section, styles.iconButton]}>
              <Icon
                style={styles.icon}
                name="insert-drive-file"
                color={theme.colors.primary}
                size={17}
              />
              <Text style={styles.textPaddingRight}>
                {file.fileType?.toUpperCase()}
              </Text>
            </View>
            <Divider />
            <View style={[styles.section, styles.iconButton]}>
              <Icon
                style={styles.icon}
                name="file-download"
                color={theme.colors.primary}
                size={17}
              />
              <Text style={styles.textPaddingRight}>
                {file.size ?? t('noFileSize')}
              </Text>
            </View>
            <Divider />
            <Text style={styles.description}>
              {file.description || t('noFileDescription')}
            </Text>
          </ScrollView>
          <View
            style={[styles.actions, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.colCenter}>
              <IconButton icon="share" size={48} onPress={handleShare} />
              <Text>{t('share')}</Text>
            </View>
            {DeviceInfo.isMac() && (
              <View style={styles.colCenter}>
                <IconButton
                  icon="download"
                  size={48}
                  onPress={handleCopyToDownloadsFolder}
                />
                <Text>{t('download')}</Text>
              </View>
            )}
            {Platform.OS === 'android' && (
              <View style={styles.colCenter}>
                <IconButton icon="open-in-new" size={48} onPress={handleOpen} />
                <Text>{t('open')}</Text>
              </View>
            )}
          </View>
        </>
      )}
      {progress ? (
        <ProgressBar style={styles.progressBar} progress={progress} />
      ) : null}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' && !DeviceInfo.isMac() ? 96 : 32,
    opacity: 0.95,
  },
  colCenter: {
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textPaddingRight: {
    paddingRight: 16,
  },
  icon: {
    marginRight: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    padding: 16,
    fontSize: 16,
  },
  categoryChip: {
    marginBottom: 8,
  },
});

export default FileDetail;
