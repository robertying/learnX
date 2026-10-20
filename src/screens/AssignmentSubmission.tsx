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
import mimeTypes from 'mime-types';
import { RemoteFile } from 'thu-learn-lib';
import * as Haptics from 'expo-haptics';
import SafeArea from 'components/SafeArea';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import { getExtension, stripExtension } from 'helpers/fs';
import { removeTags } from 'helpers/html';
import { isLocaleChinese, t } from 'helpers/i18n';
import { useAppDispatch, useAppSelector } from 'data/store';
import { File } from 'data/types/state';
import { submitAssignment } from 'data/source';
import {
  getAssignmentsForCourse,
  setPendingAssignmentData,
} from 'data/actions/assignments';
import useToast from 'hooks/useToast';
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
  } = route.params;

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

  const getDefaultAttachmentName = useCallback(
    (mimeType?: string | null) => {
      const ext = mimeTypes.extension(mimeType ?? 'application/octet-stream');
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
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        return;
      }
      const files = result.assets;
      if (!files || files.length === 0) {
        throw new Error('No file picked');
      }

      const file = files[0];
      setAttachmentResult({
        uri: file.uri,
        type: file.mimeType ?? null,
        name: file.name ?? getDefaultAttachmentName(file.mimeType),
        size: file.size,
      });
      dispatch(setPendingAssignmentData(null));
    } catch {
      toast(t('filePickFailed'), 'error');
    }
  };

  const handlePhotoPick = async () => {
    handlePickerMenuClose();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
      });
      if (result.canceled) {
        return;
      }
      const photos = result.assets;
      if (!photos || photos.length === 0) {
        throw new Error('No photo picked');
      }

      const photo = photos[0];
      setAttachmentResult({
        uri: photo.uri,
        type: photo.mimeType ?? null,
        name: getDefaultAttachmentName(photo.mimeType),
        size: photo.fileSize,
      });
      dispatch(setPendingAssignmentData(null));
    } catch {
      toast(t('filePickFailed'), 'error');
    }
  };

  const handleFileOpen = (
    attachment?: RemoteFile & { type?: string | null },
  ) => {
    if (attachment) {
      navigation.push('FileDetail', {
        id,
        courseName,
        title: stripExtension(attachment.name),
        downloadUrl: attachment.downloadUrl,
        fileType:
          (attachment.type
            ? mimeTypes.extension(attachment.type)
            : getExtension(attachment.name)) || '',
      } as File);
    }
  };

  const handleSubmit = useCallback(async () => {
    setUploadError(false);
    setUploading(true);

    try {
      if (removeAttachment) {
        await submitAssignment(
          studentHomeworkId,
          '',
          undefined,
          setProgress,
          true,
        );
      } else if (content || attachmentResult) {
        const replaceName = (name: string) => {
          const customName = customAttachmentName.trim();
          if (!customName) {
            return name;
          }
          const ext = getExtension(name);
          return `${customName}.${ext}`;
        };

        await submitAssignment(
          studentHomeworkId,
          content,
          attachmentResult
            ? {
                uri: attachmentResult.uri,
                name: replaceName(attachmentResult.name),
              }
            : undefined,
          setProgress,
        );
      }

      setUploading(false);
      setProgress(0);

      dispatch(setPendingAssignmentData(null));
      dispatch(getAssignmentsForCourse(courseId));

      toast(t('assignmentSubmissionSucceeded'), 'success');
      navigation.goBack();
    } catch {
      setUploading(false);
      setUploadError(true);
      setProgress(0);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
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

  useEffect(() => {
    if (pendingAssignmentData) {
      setAttachmentResult({
        uri: pendingAssignmentData.data,
        type: pendingAssignmentData.mimeType,
        name: getDefaultAttachmentName(pendingAssignmentData.mimeType),
      });
    }
  }, [getDefaultAttachmentName, pendingAssignmentData]);

  return (
    <Portal.Host>
      <SafeArea>
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
                <Button
                  disabled={uploading}
                  mode="contained"
                  style={styles.submitButton}
                  onPress={handleUploadedAttachmentRemove}
                >
                  {removeAttachment
                    ? t('undoRemoveUploadedAttachment')
                    : t('removeUploadedAttachment')}
                </Button>
              ) : undefined}
              {attachmentResult && !removeAttachment ? (
                <Button
                  disabled={uploading}
                  mode="contained"
                  style={styles.submitButton}
                  onPress={handlePickedAttachmentRemove}
                >
                  {t('removePickedAttachment')}
                </Button>
              ) : undefined}
              {!removeAttachment ? (
                <>
                  <Button
                    style={styles.submitButton}
                    disabled={uploading}
                    mode="contained"
                    onPress={handlePickerMenuOpen}
                  >
                    {attachmentResult
                      ? t('reUploadAttachment')
                      : submittedAttachment
                        ? t('overwriteAttachment')
                        : t('pickAttachment')}
                  </Button>
                  <Portal>
                    <Dialog
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
                          left={props => <List.Icon {...props} icon="image" />}
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
      </SafeArea>
    </Portal.Host>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 32,
  },
});

export default AssignmentSubmission;
