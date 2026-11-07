import { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Caption,
  Dialog,
  List,
  Portal,
  ProgressBar,
  Snackbar,
  TextInput,
  useTheme,
} from 'react-native-paper';
import dayjs from 'dayjs';
import mime from 'mime';
import { RemoteFile } from 'thu-learn-lib';
import * as Haptics from 'expo-haptics';
import SafeArea from 'components/SafeArea';
import ContainedButton from 'components/ContainedButton';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import { getExtension, stripExtension } from 'helpers/fs';
import { removeTags } from 'helpers/html';
import { isLocaleChinese, t } from 'helpers/i18n';
import { useAppDispatch, useAppSelector } from 'data/store';
import { Assignment } from 'data/types/state';
import { submitAssignment } from 'data/source';
import {
  getAssignmentsForCourse,
  setPendingAssignmentData,
} from 'data/actions/assignments';
import useToast from 'hooks/useToast';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { AssignmentSubmissionStackParams } from './types';

type Props = NativeStackScreenProps<
  AssignmentSubmissionStackParams,
  'AssignmentSubmission'
>;

interface AttachmentResult {
  uri: string;
  type: string | null;
  name: string;
  size?: number | null;
}

const AssignmentSubmission: React.FC<Props> = ({ navigation, route }) => {
  const assignment = useAppSelector(state =>
    state.assignments.items.find(item => item.id === route.params.id),
  );

  useHeaderTitle(navigation, t('assignmentSubmission'), assignment?.courseName);

  if (!assignment) {
    return <NotFound />;
  }

  return (
    <AssignmentSubmissionContent
      assignment={assignment}
      navigation={navigation}
    />
  );
};

const AssignmentSubmissionContent: React.FC<{
  assignment: Assignment;
  navigation: Props['navigation'];
}> = ({ assignment, navigation }) => {
  const theme = useTheme();
  const toast = useToast();

  const {
    id,
    courseId,
    courseName,
    studentHomeworkId,
    title,
    submitTime,
    submittedAttachment,
    submittedContent,
  } = assignment;

  const dispatch = useAppDispatch();

  const pendingAssignmentData = useAppSelector(
    state => state.assignments.pendingAssignmentData,
  );

  const [content, setContent] = useState(
    (removeTags(submittedContent || '') ?? '').replace('-->', ''),
  );
  const [customAttachmentName, setCustomAttachmentName] = useState('');
  const [attachmentResult, setAttachmentResult] =
    useState<AttachmentResult | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pickerMenuVisible, setPickerMenuVisible] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  const getDefaultAttachmentName = useCallback(
    (mimeType?: string | null) => {
      const ext = mime.getExtension(mimeType ?? 'application/octet-stream');
      return isLocaleChinese()
        ? `${title}-提交.${ext}`
        : `${title} Submission.${ext}`;
    },
    [title],
  );

  const handleCustomAttachmentNameChange = (text: string) => {
    setCustomAttachmentName(text.replaceAll('.', ''));
  };

  const handleUploadedAttachmentRemove = () => {
    setRemoveAttachment(!removeAttachment);
  };

  const handlePickedAttachmentRemove = () => {
    setAttachmentResult(null);
    dispatch(setPendingAssignmentData(null));
  };

  const handlePickerMenuOpen = () => {
    Keyboard.dismiss();
    setPickerMenuVisible(true);
  };

  const handlePickerMenuClose = () => {
    setPickerMenuVisible(false);
  };

  const handleDocumentPick = async () => {
    handlePickerMenuClose();
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    }).catch(() => null);
    if (result?.canceled) {
      return;
    }
    const file = result?.assets?.[0];
    if (!file) {
      toast(t('filePickFailed'), 'error');
      return;
    }

    setAttachmentResult({
      uri: file.uri,
      type: file.mimeType ?? null,
      name: file.name ?? getDefaultAttachmentName(file.mimeType),
      size: file.size,
    });
    dispatch(setPendingAssignmentData(null));
  };

  const handlePhotoPick = async () => {
    handlePickerMenuClose();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
    }).catch(() => null);
    if (result?.canceled) {
      return;
    }
    const photo = result?.assets?.[0];
    if (!photo) {
      toast(t('filePickFailed'), 'error');
      return;
    }

    setAttachmentResult({
      uri: photo.uri,
      type: photo.mimeType ?? null,
      name: getDefaultAttachmentName(photo.mimeType),
      size: photo.fileSize,
    });
    dispatch(setPendingAssignmentData(null));
  };

  const handleFileOpen = (
    attachment?: RemoteFile & { type?: string | null },
  ) => {
    if (attachment) {
      navigation.push('FileDetail', {
        attachment: {
          id,
          courseName,
          title: stripExtension(attachment.name),
          downloadUrl: attachment.downloadUrl,
          fileType:
            (attachment.type
              ? mime.getExtension(attachment.type)
              : getExtension(attachment.name)) || '',
        },
      });
    }
  };

  const handleSubmit = useCallback(async () => {
    setUploadError(false);
    setUploading(true);

    const customName = customAttachmentName.trim();
    const attachment = attachmentResult
      ? {
          uri: attachmentResult.uri,
          name: customName
            ? `${customName}.${getExtension(attachmentResult.name)}`
            : attachmentResult.name,
        }
      : undefined;
    const hasSubmission = Boolean(content || attachment);

    // React Compiler can't compile conditional expressions inside try blocks,
    // so the arguments are prepared above.
    try {
      if (removeAttachment) {
        await submitAssignment(
          studentHomeworkId,
          '',
          undefined,
          setProgress,
          true,
        );
      } else if (hasSubmission) {
        await submitAssignment(
          studentHomeworkId,
          content,
          attachment,
          setProgress,
        );
      }
    } catch {
      setUploading(false);
      setUploadError(true);
      setProgress(0);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setUploading(false);
    setProgress(0);

    dispatch(setPendingAssignmentData(null));
    dispatch(getAssignmentsForCourse(courseId));

    toast(t('assignmentSubmissionSucceeded'), 'success');
    navigation.goBack();
  }, [
    attachmentResult,
    content,
    courseId,
    customAttachmentName,
    dispatch,
    navigation,
    removeAttachment,
    studentHomeworkId,
    toast,
  ]);

  const handleSubmitPress = useCallback(() => {
    Keyboard.dismiss();

    Alert.alert(
      t('submitAssignment'),
      t('submitAssignmentConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('ok'),
          onPress: handleSubmit,
        },
      ],
      { cancelable: true },
    );
  }, [handleSubmit]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TextButton
          disabled={
            uploading || (!removeAttachment && !content && !attachmentResult)
          }
          style={{ fontSize: 17, fontWeight: 'bold' }}
          onPress={handleSubmitPress}
        >
          {t('submit')}
        </TextButton>
      ),
      unstable_headerRightItems: () => [
        {
          type: 'button',
          identifier: 'submit',
          label: t('submit'),
          icon: {
            type: 'sfSymbol',
            name: 'arrow.up.circle',
          },
          disabled:
            uploading || (!removeAttachment && !content && !attachmentResult),
          onPress: handleSubmitPress,
        },
      ],
    });
  }, [
    attachmentResult,
    content,
    handleSubmitPress,
    navigation,
    removeAttachment,
    uploading,
  ]);

  // A file shared to the app becomes the attachment.
  const [sharedAssignmentData, setSharedAssignmentData] =
    useState<typeof pendingAssignmentData>(null);
  if (pendingAssignmentData !== sharedAssignmentData) {
    setSharedAssignmentData(pendingAssignmentData);
    if (pendingAssignmentData) {
      setAttachmentResult({
        uri: pendingAssignmentData.data,
        type: pendingAssignmentData.mimeType,
        name: getDefaultAttachmentName(pendingAssignmentData.mimeType),
      });
    }
  }

  return (
    <SafeArea>
      <View
        style={Styles.flex1}
        onLayout={e => setContentWidth(e.nativeEvent.layout.width)}
      >
        <Portal.Host>
          <KeyboardAvoidingView style={Styles.flex1} behavior="height">
            {progress ? <ProgressBar progress={progress} /> : null}
            <View style={styles.inputs}>
              <TextInput
                style={styles.contentInput}
                disabled={removeAttachment || uploading}
                multiline
                placeholder={t('assignmentSubmissionContentPlaceholder')}
                value={content}
                onChangeText={setContent}
              />
              {attachmentResult && (
                <TextInput
                  disabled={removeAttachment || uploading}
                  placeholder={t('assignmentSubmissionFilenamePlaceholder')}
                  value={customAttachmentName}
                  onChangeText={handleCustomAttachmentNameChange}
                />
              )}
            </View>
            <View style={styles.submissionDetail}>
              {submittedAttachment ? (
                <TextButton
                  disabled={uploading}
                  style={
                    attachmentResult || removeAttachment
                      ? {
                          textDecorationLine: 'line-through',
                          color: theme.colors.onSurfaceDisabled,
                        }
                      : undefined
                  }
                  containerStyle={[styles.attachmentButton, Styles.spacey1]}
                  onPress={() => handleFileOpen(submittedAttachment)}
                >
                  {submittedAttachment.name}
                </TextButton>
              ) : undefined}
              {!removeAttachment && attachmentResult ? (
                <TextButton
                  containerStyle={[styles.attachmentButton, Styles.spacey1]}
                  disabled={uploading}
                  onPress={() =>
                    handleFileOpen({
                      id: '0000',
                      name: attachmentResult.name,
                      downloadUrl: attachmentResult.uri,
                      previewUrl: attachmentResult.uri,
                      size: attachmentResult.size
                        ? attachmentResult.size + 'B'
                        : '',
                      type: attachmentResult.type,
                    })
                  }
                >
                  {attachmentResult.name}{' '}
                  {pendingAssignmentData
                    ? isLocaleChinese()
                      ? '（之前分享的）'
                      : '(previously shared)'
                    : ''}
                </TextButton>
              ) : undefined}
              <View style={styles.attachmentActionButtons}>
                {submittedAttachment ? (
                  <ContainedButton
                    style={styles.submitButton}
                    label={
                      removeAttachment
                        ? t('undoRemoveUploadedAttachment')
                        : t('removeUploadedAttachment')
                    }
                    disabled={uploading}
                    onPress={handleUploadedAttachmentRemove}
                  />
                ) : undefined}
                {attachmentResult && !removeAttachment ? (
                  <ContainedButton
                    style={styles.submitButton}
                    label={t('removePickedAttachment')}
                    disabled={uploading}
                    onPress={handlePickedAttachmentRemove}
                  />
                ) : undefined}
                {!removeAttachment ? (
                  <>
                    <ContainedButton
                      style={styles.submitButton}
                      label={
                        attachmentResult
                          ? t('reUploadAttachment')
                          : submittedAttachment
                            ? t('overwriteAttachment')
                            : t('pickAttachment')
                      }
                      disabled={uploading}
                      onPress={handlePickerMenuOpen}
                    />
                    <Portal>
                      <Dialog
                        // Paper sizes dialogs from the safe area insets, which
                        // include a split view's sidebar on iPad. The host is
                        // already inside the safe area, so size it from that.
                        style={[
                          styles.pickerDialog,
                          {
                            width: Math.min(
                              pickerDialogMaxWidth,
                              contentWidth - pickerDialogMargin * 2,
                            ),
                          },
                        ]}
                        visible={pickerMenuVisible}
                        onDismiss={handlePickerMenuClose}
                      >
                        <Dialog.Title>{t('pickAttachment')}</Dialog.Title>
                        <Dialog.Content style={styles.pickerDialogContent}>
                          <List.Item
                            title={t('documents')}
                            left={props => <List.Icon {...props} icon="file" />}
                            onPress={handleDocumentPick}
                          />
                          <List.Item
                            title={t('photos')}
                            left={props => (
                              <List.Icon {...props} icon="image" />
                            )}
                            onPress={handlePhotoPick}
                          />
                        </Dialog.Content>
                        <Dialog.Actions>
                          <Button onPress={handlePickerMenuClose}>
                            {t('cancel')}
                          </Button>
                        </Dialog.Actions>
                      </Dialog>
                    </Portal>
                  </>
                ) : undefined}
              </View>
              {submitTime && (
                <Caption style={Styles.spacey1}>
                  {dayjs(submitTime).format(
                    isLocaleChinese()
                      ? '上次提交于 YYYY 年 M 月 D 日 dddd HH:mm'
                      : '[last submitted at] HH:mm, MMM D, YYYY',
                  )}
                </Caption>
              )}
            </View>
          </KeyboardAvoidingView>
          <Snackbar
            visible={uploadError}
            duration={3000}
            onDismiss={() => setUploadError(false)}
          >
            {t('assignmentSubmissionFailed')}
          </Snackbar>
        </Portal.Host>
      </View>
    </SafeArea>
  );
};

const pickerDialogMargin = 26;
const pickerDialogMaxWidth = 560;

const styles = StyleSheet.create({
  pickerDialog: {
    alignSelf: 'center',
    marginHorizontal: 0,
  },
  pickerDialogContent: {
    paddingHorizontal: 0,
  },
  inputs: {
    flex: 1,
  },
  contentInput: {
    flex: 1,
  },
  submissionDetail: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 96,
  },
  attachmentButton: {
    flex: 0,
  },
  submitButton: {
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  attachmentActionButtons: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 60,
  },
});

export default AssignmentSubmission;
