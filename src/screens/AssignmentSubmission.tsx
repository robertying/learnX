import { useEffect, useEffectEvent, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import TextField from 'components/TextField';
import { toast } from 'components/Toast';
import ProgressBar from 'components/ProgressBar';
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

  const {
    picked: attachmentResult,
    isShared,
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

  // The system's own choice sheet: an action sheet on iOS and Mac, an alert
  // on Android.
  const handlePickerOpen = () => {
    handlePickerMenuOpen();
    const options = [t('documents'), t('photos'), t('cancel')];
    const handleChoice = (index: number) => {
      if (index === 0) {
        handleDocumentPick();
      } else if (index === 1) {
        handlePhotoPick();
      } else {
        handlePickerMenuClose();
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('pickAttachment'),
          options,
          cancelButtonIndex: 2,
        },
        handleChoice,
      );
    } else {
      Alert.alert(
        t('pickAttachment'),
        undefined,
        [
          { text: options[2], style: 'cancel', onPress: () => handleChoice(2) },
          { text: options[1], onPress: () => handleChoice(1) },
          { text: options[0], onPress: () => handleChoice(0) },
        ],
        { cancelable: true, onDismiss: () => handleChoice(2) },
      );
    }
  };

  const showUploadError = useEffectEvent(() => {
    toast(t('assignmentSubmissionFailed'), 'error', 3000);
    dismissUploadError();
  });
  useEffect(() => {
    if (uploadError) {
      showUploadError();
    }
  }, [uploadError]);

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
      <View style={Styles.flex1}>
        <KeyboardAvoidingView style={Styles.flex1} behavior="height">
          {progress ? <ProgressBar progress={progress} /> : null}
          <View style={styles.inputs}>
            <TextField
              style={styles.contentInput}
              inputStyle={styles.contentInputField}
              disabled={removeAttachment || uploading}
              multiline
              placeholder={t('assignmentSubmissionContentPlaceholder')}
              value={content}
              onChangeText={setContent}
            />
            {attachmentResult && (
              <TextField
                style={styles.nameInput}
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
                    onPress={handlePickerOpen}
                  />
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
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  inputs: {
    flex: 1,
  },
  contentInput: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  contentInputField: {
    flex: 1,
  },
  nameInput: {
    marginHorizontal: 16,
    marginTop: 8,
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
