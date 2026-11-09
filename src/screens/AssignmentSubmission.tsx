import { useEffect, useEffectEvent, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { toast } from 'components/Toast';
import {
  Form,
  FormButton,
  FormFile,
  FormProgress,
  FormSection,
  FormTextField,
} from 'components/Form';
import dayjs from 'dayjs';
import { RemoteFile } from '@robertying/thu-learn-lib';
import TextButton from 'components/TextButton';
import { t } from 'helpers/i18n';
import {
  attachmentForFileDetail,
  canSubmit,
  initialSubmissionContent,
  pickedAsRemoteFile,
  sanitizeCustomAttachmentName,
} from 'helpers/submission';
import { Assignment } from 'data/types/state';
import { useAssignment } from 'data/content';
import {
  getSubmissionDraft,
  useHasSubmissionDraft,
} from 'data/submissionDrafts';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  useAttachmentPicker,
  useSaveSubmissionDraft,
  useSubmitAssignment,
} from 'hooks/useAssignmentSubmission';
import { AssignmentSubmissionParamList } from './types';

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
  const { title, submitTime, submittedAttachment, submittedContent } =
    assignment;

  const initialContent = initialSubmissionContent(submittedContent);
  // An unsent submission left from before, read once.
  const [draft] = useState(() => getSubmissionDraft(assignment.id));
  const hasDraft = useHasSubmissionDraft(assignment.id);

  const [content, setContent] = useState(draft?.content ?? initialContent);
  const [customAttachmentName, setCustomAttachmentName] = useState(
    draft?.customAttachmentName ?? '',
  );
  const [removeAttachment, setRemoveAttachment] = useState(
    draft?.removeAttachment ?? false,
  );

  const {
    picked: attachmentResult,
    isShared,
    openMenu: handlePickerMenuOpen,
    closeMenu: handlePickerMenuClose,
    pickDocument: handleDocumentPick,
    pickPhoto: handlePhotoPick,
    removePicked: handlePickedAttachmentRemove,
  } = useAttachmentPicker(title, draft?.picked);

  const { stop: stopSavingDraft } = useSaveSubmissionDraft(
    assignment.id,
    {
      content,
      customAttachmentName,
      removeAttachment,
      picked: attachmentResult,
    },
    initialContent,
  );

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
    () => {
      stopSavingDraft();
      navigation.goBack();
    },
  );

  const handleDraftDiscard = () => {
    Alert.alert(
      t('discardDraft'),
      t('discardDraftConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('discard'),
          style: 'destructive',
          onPress: () => {
            setContent(initialContent);
            setCustomAttachmentName('');
            setRemoveAttachment(false);
            handlePickedAttachmentRemove();
          },
        },
      ],
      { cancelable: true },
    );
  };

  // The system's own choice sheet: an action sheet on iOS and Mac, an alert
  // on Android.
  const handlePickerOpen = () => {
    handlePickerMenuOpen();
    const options = [t('documents'), t('photos'), t('cancel')];
    const handleChoice = (index: number) => {
      if (index === 0) {
        void handleDocumentPick();
      } else if (index === 1) {
        void handlePhotoPick();
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
          size="large"
          bold
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

  const pickLabel = attachmentResult
    ? t('reUploadAttachment')
    : submittedAttachment
      ? t('overwriteAttachment')
      : t('pickAttachment');

  return (
    <Form testID="assignmentSubmission">
      {uploading ? (
        <FormSection>
          <FormProgress
            title={t('uploadingSubmission')}
            value={progress}
            testID="uploadProgress"
          />
        </FormSection>
      ) : null}
      <FormSection
        title={t('submissionContent')}
        footer={hasDraft ? t('draftSaved') : undefined}
      >
        <FormTextField
          multiline
          disabled={removeAttachment || uploading}
          placeholder={t('assignmentSubmissionContentPlaceholder')}
          value={content}
          onChangeText={setContent}
          testID="submissionContent"
        />
      </FormSection>
      <FormSection
        title={t('submissionAttachment')}
        footer={
          submitTime
            ? dayjs(submitTime).format(t('lastSubmittedAtFormat'))
            : undefined
        }
      >
        {submittedAttachment ? (
          <FormFile
            title={submittedAttachment.name}
            icon={{ ios: 'doc', android: 'file-outline' }}
            struck={!!attachmentResult || removeAttachment}
            disabled={uploading}
            onPress={() => handleFileOpen(submittedAttachment)}
          />
        ) : null}
        {attachmentResult && !removeAttachment ? (
          <FormFile
            title={attachmentResult.name}
            icon={{ ios: 'paperclip', android: 'paperclip' }}
            detail={isShared ? t('previouslyShared') : undefined}
            disabled={uploading}
            onPress={() => handleFileOpen(pickedAsRemoteFile(attachmentResult))}
          />
        ) : null}
        {attachmentResult && !removeAttachment ? (
          <FormTextField
            plain
            disabled={uploading}
            placeholder={t('assignmentSubmissionFilenamePlaceholder')}
            value={customAttachmentName}
            onChangeText={setCustomAttachmentName}
            format={sanitizeCustomAttachmentName}
            testID="submissionFilename"
          />
        ) : null}
        {!removeAttachment ? (
          <FormButton
            title={pickLabel}
            icon={{ ios: 'doc.badge.plus', android: 'paperclip-plus' }}
            disabled={uploading}
            onPress={handlePickerOpen}
            testID="pickAttachment"
          />
        ) : null}
        {attachmentResult && !removeAttachment ? (
          <FormButton
            title={t('removePickedAttachment')}
            icon={{ ios: 'xmark.circle', android: 'close-circle-outline' }}
            destructive
            disabled={uploading}
            onPress={handlePickedAttachmentRemove}
          />
        ) : null}
        {submittedAttachment ? (
          removeAttachment ? (
            <FormButton
              title={t('undoRemoveUploadedAttachment')}
              icon={{ ios: 'arrow.uturn.backward', android: 'undo' }}
              disabled={uploading}
              onPress={handleUploadedAttachmentRemove}
            />
          ) : (
            <FormButton
              title={t('removeUploadedAttachment')}
              icon={{ ios: 'trash', android: 'delete-outline' }}
              destructive
              disabled={uploading}
              onPress={handleUploadedAttachmentRemove}
            />
          )
        ) : null}
      </FormSection>
      {hasDraft ? (
        <FormSection>
          <FormButton
            title={t('discardDraft')}
            icon={{ ios: 'trash', android: 'delete-outline' }}
            destructive
            disabled={uploading}
            onPress={handleDraftDiscard}
          />
        </FormSection>
      ) : null}
    </Form>
  );
};

export default AssignmentSubmission;
