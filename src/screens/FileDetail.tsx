import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import Icon from '@react-native-vector-icons/material-design-icons';
import Pdf from 'react-native-pdf';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { canPreviewInline, needWhiteBackground } from 'helpers/filePreview';
import { t } from 'helpers/i18n';
import Spinner from 'components/Spinner';
import SafeArea from 'components/SafeArea';
import { FileDetailParamList } from './types';
import { markFileSeen, useFile } from 'data/content';
import { DownloadableFile, File } from 'data/types/state';
import NotFound from 'components/NotFound';
import useFileDetailHeader from 'hooks/useFileDetailHeader';
import useFileDownload from 'hooks/useFileDownload';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { Text } from 'components/Text';
import {
  Form,
  FormButton,
  FormParagraph,
  FormSection,
  FormText,
} from 'components/Form';
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
    <FileDetailContent
      key={downloadKey}
      file={file}
      courseFileId={'id' in params ? params.id : undefined}
      navigation={navigation}
    />
  );
};

const FileDetailContent: React.FC<{
  file: DownloadableFile & Partial<File>;
  /** Set for a course file, not for a notice or assignment attachment. */
  courseFileId?: string;
  navigation: Props['navigation'];
}> = ({ file, courseFileId, navigation }) => {
  const theme = useTheme();

  const webViewRef = useRef<WebView>(null);

  const { path, progress, error, redownload, share, copyToDownloads, open } =
    useFileDownload(file);

  // A course file downloaded here no longer shows as new.
  useEffect(() => {
    if (path && courseFileId) {
      markFileSeen(courseFileId);
    }
  }, [path, courseFileId]);

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
        // Keys of their own: React would otherwise reuse one View for the
        // error and the loading state below.
        <View key="error" style={styles.centered}>
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
        <View key="loading" style={styles.centered}>
          <Spinner progress={progress} />
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
        <FileInfo
          file={file}
          onShare={share}
          onCopyToDownloads={copyToDownloads}
          onOpen={open}
        />
      )}
    </SafeArea>
  );
};

/** The file's details, and what to do with it, when it isn't previewed. */
const FileInfo: React.FC<{
  file: DownloadableFile & Partial<File>;
  onShare: () => void;
  onCopyToDownloads: () => void;
  onOpen: () => void;
}> = ({ file, onShare, onCopyToDownloads, onOpen }) => (
  <Form testID="file-info">
    <FormSection>
      <FormParagraph text={file.title} headline />
      {file.category?.title ? (
        <FormText title={t('fileCategory')} detail={file.category.title} />
      ) : null}
      <FormText
        title={t('fileType')}
        detail={file.fileType?.toUpperCase?.() || t('unknownFileType')}
      />
      <FormText title={t('fileSize')} detail={file.size ?? t('noFileSize')} />
      {file.courseTeacherName ? (
        <FormText title={t('fileTeacher')} detail={file.courseTeacherName} />
      ) : null}
      {file.uploadTime ? (
        <FormText
          title={t('fileUploadTime')}
          detail={dayjs(file.uploadTime).format(t('dateTimeFormat'))}
        />
      ) : null}
    </FormSection>
    <FormSection title={t('fileDescription')}>
      <FormParagraph text={file.description || t('noFileDescription')} />
    </FormSection>
    <FormSection>
      <FormButton
        title={t('share')}
        icon={{ ios: 'square.and.arrow.up', android: 'share-variant' }}
        onPress={onShare}
      />
      {DeviceInfo.isMac() ? (
        <FormButton
          title={t('download')}
          icon={{ ios: 'arrow.down.circle', android: 'download' }}
          onPress={onCopyToDownloads}
        />
      ) : null}
      {Platform.OS === 'android' ? (
        <FormButton
          title={t('open')}
          icon={{ ios: 'arrow.up.forward.app', android: 'open-in-new' }}
          onPress={onOpen}
        />
      ) : null}
    </FormSection>
  </Form>
);

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FileDetail;
