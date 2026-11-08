import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  List,
  Portal,
  ProgressBar,
  Snackbar,
  TextInput,
} from 'react-native-paper';
import dayjs from 'dayjs';
import { RemoteFile } from 'thu-learn-lib';
import SafeArea from 'components/SafeArea';
import ContainedButton from 'components/ContainedButton';
import TextButton from 'components/TextButton';
import Styles from 'constants/Styles';
import { isLocaleChinese, t } from 'helpers/i18n';
import {
  attachmentForFileDetail,
  canSubmit,
  initialSubmissionContent,
  pickedAsRemoteFile,
  sanitizeCustomAttachmentName,
} from 'helpers/submission';
import { Assignment } from 'data/types/state';
import { useAssignment } from 'data/content';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  useAttachmentPicker,
  useSubmitAssignment,
} from 'hooks/useAssignmentSubmission';
import { AssignmentSubmissionParamList } from './types';
import { Caption } from 'components/Text';
import { useTheme } from 'theme';

type Props = NativeStackScreenProps<
  AssignmentSubmissionParamList,
  'AssignmentSubmission'
>;

const AssignmentSubmission: React.FC<Props> = ({ navigation, route }) => {
  const assignment = useAssignment(route.params.id);

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

  const { title, submitTime, submittedAttachment, submittedContent } =
    assignment;

  const [content, setContent] = useState(
    initialSubmissionContent(submittedContent),
  );
  const [customAttachmentName, setCustomAttachmentName] = useState('');
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  const {
    picked: attachmentResult,
    isShared,
    menuVisible: pickerMenuVisible,
    openMenu: handlePickerMenuOpen,
    closeMenu: handlePickerMenuClose,
    pickDocument: handleDocumentPick,
    pickPhoto: handlePhotoPick,
    removePicked: handlePickedAttachmentRemove,
  } = useAttachmentPicker(title);

  const {
    uploading,
    uploadError,
    dismissUploadError,
    progress,
    confirmSubmit,
  } = useSubmitAssignment(
    assignment,
    {
      content,
      picked: attachmentResult,
      customAttachmentName,
      removeAttachment,
    },
    () => navigation.goBack(),
  );

  const handleCustomAttachmentNameChange = (text: string) => {
    setCustomAttachmentName(sanitizeCustomAttachmentName(text));
  };

  const handleUploadedAttachmentRemove = () => {
    setRemoveAttachment(!removeAttachment);
  };

  const handleFileOpen = (
    attachment?: RemoteFile & { type?: string | null },
  ) => {
    if (attachment) {
      navigation.push('FileDetail', {
        attachment: attachmentForFileDetail(assignment, attachment),
      });
    }
  };

  const submitDisabled = !canSubmit({
    uploading,
    removeAttachment,
    content,
    picked: attachmentResult,
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TextButton
          disabled={submitDisabled}
          style={{ fontSize: 17, fontWeight: 'bold' }}
          onPress={confirmSubmit}
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
          disabled: submitDisabled,
          onPress: confirmSubmit,
        },
      ],
    });
  }, [confirmSubmit, navigation, submitDisabled]);

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
                    handleFileOpen(pickedAsRemoteFile(attachmentResult))
                  }
                >
                  {attachmentResult.name}{' '}
                  {isShared
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
            onDismiss={dismissUploadError}
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
