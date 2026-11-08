import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ProgressBar from 'components/ProgressBar';
import Chip from 'components/Chip';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import Icon from '@react-native-vector-icons/material-design-icons';
import Pdf from 'react-native-pdf';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { canPreviewInline, needWhiteBackground } from 'helpers/filePreview';
import { t } from 'helpers/i18n';
import Skeleton from 'components/Skeleton';
import SafeArea from 'components/SafeArea';
import IconButton from 'components/IconButton';
import ScrollView from 'components/ScrollView';
import { FileDetailParamList } from './types';
import { useFile } from 'data/content';
import { DownloadableFile, File } from 'data/types/state';
import NotFound from 'components/NotFound';
import useFileDetailHeader from 'hooks/useFileDetailHeader';
import useFileDownload from 'hooks/useFileDownload';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { Caption, Text, Title } from 'components/Text';
import Divider from 'components/Divider';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<FileDetailParamList, 'FileDetail'>;

const FileDetail: React.FC<Props> = ({ route, navigation }) => {
  const { params } = route;
  const storeFile = useFile('id' in params ? params.id : '');
  const file = 'attachment' in params ? params.attachment : storeFile;

  useHeaderTitle(navigation, file?.title, file?.courseName);

  if (!file) {
    return <NotFound />;
  }

  // Only what the download depends on: a store refresh that leaves these as
  // they were keeps the downloaded file on screen, and a new file shown in
  // this screen starts over, like a refresh.
  const downloadKey = [
    file.id,
    file.courseName,
    file.title,
    file.fileType,
    file.downloadUrl,
  ].join('\n');

  return (
    <FileDetailContent key={downloadKey} file={file} navigation={navigation} />
  );
};

const FileDetailContent: React.FC<{
  file: DownloadableFile & Partial<File>;
  navigation: Props['navigation'];
}> = ({ file, navigation }) => {
  const theme = useTheme();

  const webViewRef = useRef<WebView>(null);

  const { path, progress, error, redownload, share, copyToDownloads, open } =
    useFileDownload(file);
  const [showInfo, setShowInfo] = useState(false);

  const canRender = !!path && canPreviewInline(file.fileType);

  const handleShowInfo = useCallback(() => {
    setShowInfo(shown => !shown);
  }, []);

  useFileDetailHeader({
    navigation,
    path,
    progress,
    error,
    canRender,
    showInfo,
    onRefresh: redownload,
    onShare: share,
    onCopyToDownloads: copyToDownloads,
    onOpen: open,
    onToggleInfo: handleShowInfo,
  });

  return (
    <SafeArea testID="file-detail" collapsable={false}>
      {error ? (
        // A key of its own: React would otherwise reuse the skeleton list's
        // View below, which keeps its taller height on iOS and pushes the
        // centered icon down behind the tab bar.
        <View key="error" style={styles.errorRoot}>
          <Icon
            style={Styles.spacey1}
            name="alert-circle"
            color={theme.colors.outline}
            size={56}
          />
          <Text style={[Styles.spacey1, { color: theme.colors.outline }]}>
            {t('fileDownloadFailed')}
          </Text>
        </View>
      ) : !path ? (
        <View>
          {progress ? <ProgressBar progress={progress} /> : null}
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
        </View>
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
            style={[Styles.flex1, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.section}>
              <View style={Styles.flexRowCenter}>
                {file.category?.title && (
                  <Chip style={styles.categoryChip}>
                    {file.category?.title}
                  </Chip>
                )}
              </View>
              <Title>{file.title}</Title>
              <View style={Styles.flexRowCenter}>
                <Caption>{file.courseTeacherName}</Caption>
                <Caption>
                  {dayjs(file.uploadTime).format(t('dateTimeFormat'))}
                </Caption>
              </View>
            </View>
            <Divider />
            <View style={[styles.section, styles.iconButton]}>
              <Icon
                style={styles.icon}
                name="file"
                color={theme.colors.primary}
                size={17}
              />
              <Text style={styles.textPaddingRight}>
                {file.fileType?.toUpperCase?.() || t('unknownFileType')}
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
              <IconButton icon="share" size={48} onPress={share} />
              <Text>{t('share')}</Text>
            </View>
            {DeviceInfo.isMac() && (
              <View style={styles.colCenter}>
                <IconButton
                  icon="download"
                  size={48}
                  onPress={copyToDownloads}
                />
                <Text>{t('download')}</Text>
              </View>
            )}
            {Platform.OS === 'android' && (
              <View style={styles.colCenter}>
                <IconButton icon="open-in-new" size={48} onPress={open} />
                <Text>{t('open')}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' && !DeviceInfo.isMac() ? 96 : 32,
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
