import {useCallback, useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import DocumentPicker, {
  DocumentPickerResponse,
} from 'react-native-document-picker';
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
  TextInput,
  useTheme,
} from 'react-native-paper';
import dayjs from 'dayjs';
import {RemoteFile} from 'thu-learn-lib-no-native/lib/types';
import SafeArea from 'components/SafeArea';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import {getExtension, stripExtension} from 'helpers/fs';
import {removeTags} from 'helpers/html';
import {getLocale, t} from 'helpers/i18n';
import {File} from 'data/types/state';
import {submitAssignment} from 'data/source';
import {getAssignmentsForCourse} from 'data/actions/assignments';
import useToast from 'hooks/useToast';
import {ScreenParams} from './types';
import {useAppDispatch} from 'data/store';

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
    submitTime,
    submittedAttachment,
    submittedContent,
  } = route.params;

  const dispatch = useAppDispatch();

  const [content, setContent] = useState(
    (removeTags(submittedContent || '') ?? '').replace('-->', ''),
  );
  const [attachmentResult, setAttachmentResult] = useState<
    (DocumentPickerResponse & {name: string}) | null
  >(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
        name:
          result.name ?? (getLocale().startsWith('zh') ? '附件' : 'attachment'),
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err as Error)) {
        toast(t('filePickFailed'), 'error');
      }
    }
  };

  const handleFileOpen = (attachment?: RemoteFile) => {
    if (attachment) {
      navigation.push('FileDetail', {
        id,
        courseName,
        title: stripExtension(attachment.name),
        downloadUrl: attachment.downloadUrl,
        fileType: getExtension(attachment.name) ?? '',
      } as File);
    }
  };

  const handleSubmit = useCallback(async () => {
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
        await submitAssignment(
          studentHomeworkId,
          content,
          attachmentResult
            ? {
                uri: attachmentResult.uri,
                name: attachmentResult.name,
              }
            : undefined,
          setProgress,
        );
      }

      setUploading(false);
      setProgress(0);

      dispatch(getAssignmentsForCourse(courseId));

      toast(t('assignmentSubmittionSucceeded'), 'success');
      navigation.goBack();
    } catch {
      setUploading(false);
      setProgress(0);
      toast(t('assignmentSubmittionFailed'), 'error');
    }
  }, [
    attachmentResult,
    content,
    courseId,
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

  return (
    <SafeArea>
      <KeyboardAvoidingView
        style={Styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {progress ? <ProgressBar progress={progress} /> : undefined}
        <ScrollView
          contentContainerStyle={styles.scrollView}
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled">
          <TextInput
            style={Styles.flex1}
            multiline
            placeholder={t('assignmentSubmittionContentPlaceholder')}
            value={content}
            onChangeText={setContent}
          />
        </ScrollView>
        <View style={styles.submissionDetail}>
          {submittedAttachment ? (
            <TextButton
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
              onPress={() =>
                handleFileOpen({
                  id: '0000',
                  name: attachmentResult.name,
                  downloadUrl: attachmentResult.uri,
                  previewUrl: attachmentResult.uri,
                  size: attachmentResult.size + 'B',
                })
              }>
              {attachmentResult.name}
            </TextButton>
          ) : undefined}
          <View style={styles.attachmentActionButtons}>
            {submittedAttachment ? (
              <Button
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
                getLocale().startsWith('zh')
                  ? '上次提交于 YYYY 年 M 月 D 日 dddd HH:mm'
                  : '[last submitted at] HH:mm, MMM D, YYYY',
              )}
            </Caption>
          )}
        </View>
      </KeyboardAvoidingView>
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
