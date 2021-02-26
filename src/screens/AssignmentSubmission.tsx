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
import dayjs from 'dayjs';
import SafeArea from 'components/SafeArea';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import {getExtension, stripExtension} from 'helpers/fs';
import {removeTags} from 'helpers/html';
import {File} from 'data/types/state';
import {submitAssignment} from 'data/source';
import useToast from 'hooks/useToast';
import {ScreenParams} from './types';

const AssignmentSubmission: React.FC<
  StackScreenProps<ScreenParams, 'AssignmentSubmission'>
> = ({navigation, route}) => {
  const theme = useTheme();
  const toast = useToast();

  const {
    id,
    courseName,
    studentHomeworkId,
    submitTime,
    submittedAttachmentName,
    submittedAttachmentUrl,
    submittedContent,
  } = route.params;

  const [content, setContent] = useState(
    (removeTags(submittedContent || '') ?? '').replace('-->', ''),
  );
  const [
    attachmentResult,
    setAttachmentResult,
  ] = useState<DocumentPickerResponse | null>(null);
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
        toast('选取文件失败', 'error');
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
      navigation.goBack();
      toast('作业提交成功', 'success');
    } catch {
      setUploading(false);
      setProgress(0);
      toast('作业提交失败', 'error');
    }
  }, [
    attachmentResult,
    content,
    navigation,
    removeAttachment,
    studentHomeworkId,
    toast,
  ]);

  const handleSubmitPress = useCallback(() => {
    Keyboard.dismiss();

    Alert.alert(
      '提交作业',
      '确定提交作业？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
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
          提交
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
            placeholder="可在此处填写作业内容……"
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
          <View style={Styles.flexRow}>
            {submittedAttachmentName ? (
              <Button
                mode="contained"
                style={[styles.submitButton, Styles.spacey1]}
                onPress={handleAttachmentRemove}>
                {removeAttachment ? '撤销移除已上传附件' : '移除已上传附件'}
              </Button>
            ) : undefined}
            {!removeAttachment ? (
              <Button
                mode="contained"
                style={[styles.submitButton, Styles.spacey1]}
                onPress={handleDocumentPick}>
                {attachmentResult
                  ? '重新上传附件'
                  : submittedAttachmentName
                  ? '覆盖已上传附件'
                  : '上传附件'}
              </Button>
            ) : undefined}
          </View>
          {submitTime && (
            <Caption style={Styles.spacey1}>
              {dayjs(submitTime).format(
                '上次提交于 YYYY 年 M 月 D 日 dddd HH:mm',
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
});

export default AssignmentSubmission;
