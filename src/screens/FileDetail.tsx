import { useEffect, useState } from 'react';
import { scrollInsetBehavior } from 'constants/scrollInsetBehavior';
import { Linking, StyleSheet, View, ViewProps } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import WebView from 'react-native-webview';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import {
  isPreviewLoad,
  needWhiteBackground,
  previewKind,
} from 'helpers/filePreview';
import {
  isQuickLookAvailable,
  QuickLookView,
  showQuickLookPanel,
} from 'modules/quicklook';
import { PdfView, type PdfFailure } from 'modules/pdf';
import { formatDate, t } from 'helpers/i18n';
import { displayFileSize } from 'helpers/filename';
import Spinner from 'components/Spinner';
import SafeArea from 'components/SafeArea';
import { FileDetailParamList } from 'navigation/types';
import { markFileSeen, useFile } from 'data/content';
import { DownloadableFile, File } from 'data/types/state';
import NotFound from 'components/NotFound';
import useAppCommand from 'hooks/useAppCommand';
import useFileDetailHeader from 'hooks/useFileDetailHeader';
import useFileDownload from 'hooks/useFileDownload';
import useHeaderTitle from 'hooks/useHeaderTitle';
import StatusView from 'components/StatusView';
import {
  Form,
  FormButton,
  FormParagraph,
  FormSection,
  FormScreen,
  FormText,
} from 'components/Form';
import { isAndroid, isApple, isElectron } from 'helpers/platform';
import { useWindowTitle } from 'hooks/useWindow';

type Props = NativeStackScreenProps<FileDetailParamList, 'FileDetail'>;

const FileDetail: React.FC<Props> = ({ route, navigation }) => {
  const { params } = route;
  const storeFile = useFile('id' in params ? params.id : '');
  const file = 'attachment' in params ? params.attachment : storeFile;

  useHeaderTitle(navigation, file?.title, file?.courseName);
  useWindowTitle(file?.title);

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
  const { path, progress, error, redownload, share, save, open, showInFolder } =
    useFileDownload(file);

  // A course file downloaded here no longer shows as new.
  useEffect(() => {
    if (path && courseFileId) {
      markFileSeen(courseFileId);
    }
  }, [path, courseFileId]);

  const [showInfo, setShowInfo] = useState(false);
  // Why the PDF viewer couldn't show the file: it needs a password, or it is
  // damaged or not a PDF after all.
  const [previewFailure, setPreviewFailure] = useState<PdfFailure | null>(null);

  const handlePreviewError = (event: { nativeEvent: { reason: PdfFailure } }) =>
    setPreviewFailure(event.nativeEvent.reason);
  // The Mac's Quick Look preview had no window to show in: the file's info
  // shows instead, as for a file it can't preview.
  const [quickLookUnavailable, setQuickLookUnavailable] = useState(false);

  const handleRedownload = () => {
    setPreviewFailure(null);
    redownload();
  };

  const kind = previewKind(file.fileType);
  const previewable = !!kind && !(kind === 'quickLook' && quickLookUnavailable);
  const canRender = !!path && previewable;

  const handleShowInfo = () => setShowInfo(shown => !shown);

  const handleQuickLook = () => {
    if (path) {
      void showQuickLookPanel(path);
    }
  };
  // ⌘Y, as in Finder (the Mac's File menu).
  const isFocused = useIsFocused();
  useAppCommand(
    'quickLook',
    handleQuickLook,
    isFocused && !!path && isQuickLookAvailable,
  );

  useFileDetailHeader({
    navigation,
    path,
    progress,
    error,
    previewable,
    showInfo,
    onRefresh: handleRedownload,
    onQuickLook: handleQuickLook,
    onShare: share,
    onSave: save,
    onOpen: open,
    onToggleInfo: handleShowInfo,
  });

  // The details are a Form, which keeps to the safe area itself.
  const showsDetails = !error && !!path && (showInfo || !canRender);
  const Root = showsDetails ? FormScreen : PreviewRoot;

  return (
    <Root testID="file-detail" collapsable={false}>
      {error ? (
        // Keys of their own: React would otherwise reuse one View for the
        // error and the loading state below.
        <StatusView
          key="error"
          testID="file-error"
          icon="error"
          title={t('fileDownloadFailedTitle')}
          description={t('fileDownloadFailedDescription')}
          actions={[{ label: t('tryAgain'), onPress: handleRedownload }]}
        />
      ) : !path ? (
        <View key="loading" testID="file-loading" style={styles.centered}>
          <Spinner progress={progress} />
        </View>
      ) : !showInfo && canRender && previewFailure === 'password' ? (
        // The viewer can't ask for the password: another app can (Android's
        // chooser, iOS's share sheet, the Mac's Quick Look).
        <StatusView
          key="preview-locked"
          testID="file-preview-locked"
          icon="locked"
          title={t('pdfPasswordTitle')}
          description={t('pdfPasswordDescription')}
          actions={[
            isAndroid()
              ? { label: t('open'), onPress: open }
              : isQuickLookAvailable
                ? { label: t('quickLook'), onPress: handleQuickLook }
                : { label: t('share'), onPress: share },
          ]}
        />
      ) : !showInfo && canRender && previewFailure ? (
        <StatusView
          key="preview-failed"
          testID="file-preview-failed"
          icon="error"
          title={t('previewFailedTitle')}
          description={t('previewFailedDescription')}
          actions={[{ label: t('downloadAgain'), onPress: handleRedownload }]}
        />
      ) : !showInfo && canRender ? (
        kind === 'pdf' ? (
          <PdfView
            style={Styles.flex1}
            uri={path}
            title={file.title}
            onError={handlePreviewError}
          />
        ) : kind === 'quickLook' ? (
          <QuickLookView
            testID="quick-look"
            style={Styles.flex1}
            uri={path}
            onUnavailable={() => setQuickLookUnavailable(true)}
          />
        ) : (
          <WebView
            style={{
              backgroundColor: needWhiteBackground(file.fileType)
                ? 'white'
                : 'transparent',
            }}
            source={{
              uri: path,
            }}
            // Course files are only shown: scripts in a downloaded .html or
            // .svg file don't run.
            javaScriptEnabled={false}
            originWhitelist={['*']}
            // The preview stays on the file: a web page in its place would
            // look like part of learnX. A tapped web or mail link opens
            // outside the app.
            onShouldStartLoadWithRequest={request => {
              if (isPreviewLoad(request.url)) {
                return true;
              }
              if (
                request.navigationType === 'click' &&
                /^(https?|mailto):/i.test(request.url)
              ) {
                Linking.openURL(request.url).catch(() => {});
              }
              return false;
            }}
            decelerationRate={isApple() ? 'normal' : undefined}
            contentInsetAdjustmentBehavior={scrollInsetBehavior}
            // React Native's own inset adds the screen's safe area to
            // `contentInset`, on top of the system's adjustment above, which
            // would count the header and the home indicator twice.
            automaticallyAdjustContentInsets={false}
          />
        )
      ) : (
        <FileInfo
          file={file}
          previewable={canRender}
          onQuickLook={handleQuickLook}
          onShare={share}
          onSave={save}
          onOpen={open}
          onShowInFolder={showInFolder}
        />
      )}
    </Root>
  );
};

/**
 * The file, or its download's progress or error. Its pages stay white in dark
 * mode, so it keeps clear of the header and tab bar rather than scrolling
 * under them.
 */
const PreviewRoot: React.FC<ViewProps> = props => (
  <SafeArea clearOfBars {...props} />
);

/** The file's details, and what to do with it, when it isn't previewed. */
const FileInfo: React.FC<{
  file: DownloadableFile & Partial<File>;
  /** Whether the file shows inline, when its info is asked for. */
  previewable: boolean;
  onQuickLook: () => void;
  onShare: () => void;
  onSave: () => void;
  onOpen: () => void;
  onShowInFolder: () => void;
}> = ({
  file,
  previewable,
  onQuickLook,
  onShare,
  onSave,
  onOpen,
  onShowInFolder,
}) => (
  <Form testID="file-info">
    <FormSection>
      <FormParagraph text={file.title} headline />
      {file.category?.title ? (
        <FormText title={t('fileCategory')} detail={file.category.title} />
      ) : null}
      <FormText
        title={t('fileType')}
        detail={file.fileType?.toUpperCase() || t('unknownFileType')}
      />
      <FormText
        title={t('fileSize')}
        detail={file.size ? displayFileSize(file.size) : t('noFileSize')}
      />
      {file.courseTeacherName ? (
        <FormText title={t('fileTeacher')} detail={file.courseTeacherName} />
      ) : null}
      {file.uploadTime ? (
        <FormText
          title={t('fileUploadTime')}
          detail={formatDate(file.uploadTime, 'dateTimeFormat')}
        />
      ) : null}
    </FormSection>
    <FormSection title={t('fileDescription')}>
      <FormParagraph text={file.description || t('noFileDescription')} />
    </FormSection>
    {isElectron() ? (
      // No share sheet: the file opens, saves and shows as a desktop's do.
      <FormSection
        footer={previewable ? undefined : t('fileOpensInDefaultApp')}
      >
        <FormButton
          title={t('openInDefaultApp')}
          icon="open"
          onPress={onOpen}
          testID="file-open"
        />
        <FormButton
          title={t('saveAs')}
          icon="download"
          onPress={onSave}
          testID="file-save-as"
        />
        <FormButton
          title={t('showInFolder')}
          icon="folder"
          onPress={onShowInFolder}
        />
      </FormSection>
    ) : (
      <FormSection>
        {isQuickLookAvailable ? (
          <FormButton
            title={t('quickLook')}
            icon="quickLook"
            onPress={onQuickLook}
          />
        ) : null}
        <FormButton title={t('share')} icon="share" onPress={onShare} />
        {DeviceInfo.isMac() ? (
          <FormButton title={t('download')} icon="download" onPress={onSave} />
        ) : null}
        {isAndroid() ? (
          <FormButton title={t('open')} icon="open" onPress={onOpen} />
        ) : null}
      </FormSection>
    )}
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
