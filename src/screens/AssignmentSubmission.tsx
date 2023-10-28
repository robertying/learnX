import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import DocumentPicker from 'react-native-document-picker';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Caption,
  ProgressBar,
  Snackbar,
  TextInput,
  useTheme,
} from 'react-native-paper';
import dayjs from 'dayjs';
import mimeTypes from 'mime-types';
import {RemoteFile} from 'thu-learn-lib';
import * as Haptics from 'expo-haptics';
import SafeArea from 'components/SafeArea';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import {getExtension, stripExtension} from 'helpers/fs';
import {removeTags} from 'helpers/html';
import {isLocaleChinese, t} from 'helpers/i18n';
import {File} from 'data/types/state';
import {submitAssignment} from 'data/source';
import {
  getAssignmentsForCourse,
  setPendingAssignmentData,
} from 'data/actions/assignments';
import useToast from 'hooks/useToast';
import {ScreenParams} from './types';
import {useAppDispatch, useAppSelector} from 'data/store';

interface AttachmentResult {
  uri: string;
  type: string | null;
  name: string;
  size?: number | null;
}

const AssignmentSubmission: React.FC<
  React.PropsWithChildren<
    NativeStackScreenProps<ScreenParams, 'AssignmentSubmission'>
  >
> = ({navigation, route}) => {
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

  const handleAttachmentRemove = () => {
    setRemoveAttachment(!removeAttachment);
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      setAttachmentResult({
        ...result,
        name: result.name ?? getDefaultAttachmentName(result.type),
      });
      dispatch(setPendingAssignmentData(null));
    } catch (err) {
      if (!DocumentPicker.isCancel(err as Error)) {
        toast(t('filePickFailed'), 'error');
      }
    }
  };

  const handleFileOpen = (attachment?: RemoteFile & {type?: string | null}) => {
    if (attachment) {
      navigation.push('FileDetail', {
        id,
        courseName,
        title: stripExtension(attachment.name),
        downloadUrl: attachment.downloadUrl,
        fileType:
          (attachment.type
            ? mimeTypes.extension(attachment.type)
            : getExtension(attachment.name)) ?? '',
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
      {cancelable: true},
    );
  }, [handleSubmit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TextButton
          disabled={
            uploading || (!removeAttachment && !content && !attachmentResult)
          }
          style={{fontSize: 17, fontWeight: 'bold'}}
          onPress={handleSubmitPress}>
          {t('submit')}
        </TextButton>
      ),
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
    <SafeArea>
      <KeyboardAvoidingView
        style={Styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {progress ? <ProgressBar progress={progress} /> : null}
        <ScrollView
          contentContainerStyle={styles.scrollView}
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled">
          <TextInput
            style={Styles.flex1}
            disabled={removeAttachment || uploading}
            multiline
            placeholder={t('assignmentSubmissionContentPlaceholder')}
            value={content}
            onChangeText={setContent}
          />
          <TextInput
            disabled={removeAttachment || uploading}
            placeholder={t('assignmentSubmissionFilenamePlaceholder')}
            value={customAttachmentName}
            onChangeText={handleCustomAttachmentNameChange}
          />
        </ScrollView>
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
              onPress={() => handleFileOpen(submittedAttachment)}>
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
              }>
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
                style={[styles.submitButton, Styles.spacey1]}
                onPress={handleAttachmentRemove}>
                {removeAttachment
                  ? t('undoRemoveAttachment')
                  : t('removeAttachment')}
              </Button>
            ) : undefined}
            {!removeAttachment ? (
              <Button
                disabled={uploading}
                mode="contained"
                style={[styles.submitButton, Styles.spacey1]}
                onPress={handleDocumentPick}>
                {attachmentResult
                  ? t('reUploadAttachment')
                  : submittedAttachment
                  ? t('overwriteAttachment')
                  : t('uploadAttachment')}
              </Button>
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
        onDismiss={() => setUploadError(false)}>
        {t('assignmentSubmissionFailed')}
      </Snackbar>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
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
  },
});

export default AssignmentSubmission;
