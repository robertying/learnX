import React, {useCallback, useEffect, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
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
import {useDispatch} from 'react-redux';
import dayjs from 'dayjs';
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

const AssignmentSubmission: React.FC<
  StackScreenProps<ScreenParams, 'AssignmentSubmission'>
> = ({navigation, route}) => {
  const theme = useTheme();
  const toast = useToast();

  const {
    id,
    courseId,
    courseName,
    studentHomeworkId,
    submitTime,
    submittedAttachmentName,
    submittedAttachmentUrl,
    submittedContent,
  } = route.params;

  const dispatch = useDispatch();

  const [content, setContent] = useState(
    (removeTags(submittedContent || '') ?? '').replace('-->', ''),
  );
  const [attachmentResult, setAttachmentResult] =
    useState<DocumentPickerResponse | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAttachmentRemove = () => {
    setRemoveAttachment(!removeAttachment);
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setAttachmentResult(result);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        toast(t('filePickFailed'), 'error');
      }
    }
  };

  const handleFileOpen = (name?: string, url?: string) => {
    if (name && url) {
      navigation.push('FileDetail', {
        id,
        courseName,
        title: stripExtension(name),
        downloadUrl: url,
        fileType: getExtension(name) ?? '',
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TextButton
          disabled={
            uploading || (!removeAttachment && !content && !attachmentResult)
          }
          style={{fontSize: 17, fontWeight: 'bold'}}
          containerStyle={{marginRight: 16}}
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
          {submittedAttachmentName ? (
            <TextButton
              style={
                attachmentResult || removeAttachment
                  ? {
                      textDecorationLine: 'line-through',
                      color: theme.colors.disabled,
                    }
                  : undefined
              }
              containerStyle={[styles.attachmentButton, Styles.spacey1]}
              onPress={() =>
                handleFileOpen(submittedAttachmentName, submittedAttachmentUrl)
              }>
              {submittedAttachmentName}
            </TextButton>
          ) : undefined}
          {!removeAttachment && attachmentResult ? (
            <TextButton
              containerStyle={[styles.attachmentButton, Styles.spacey1]}
              onPress={() =>
                handleFileOpen(attachmentResult.name, attachmentResult.uri)
              }>
              {attachmentResult.name}
            </TextButton>
          ) : undefined}
          <View style={styles.attachmentActionButtons}>
            {submittedAttachmentName ? (
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
                  : submittedAttachmentName
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
