import { useEffect, useEffectEvent, useLayoutEffect, useState } from 'react';
import useHeaderButtons from 'hooks/useHeaderButtons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Platform } from 'react-native';
import { showChoices } from 'components/choiceSheet';
import { toast } from 'components/Toast';
import {
  Form,
  FormButton,
  FormFile,
  FormProgress,
  FormScreen,
  FormSection,
  FormTextField,
  FormTitle,
} from 'components/Form';
import dayjs from 'dayjs';
import { RemoteFile } from '@robertying/thu-learn-lib';
import { attachmentFile } from 'helpers/attachments';
import { t } from 'helpers/i18n';
import { deadlineText } from 'helpers/assignments';
import { useMinute } from 'hooks/useClock';
import {
  canSubmit,
  initialSubmissionContent,
  pickedAsRemoteFile,
  sanitizeCustomAttachmentName,
} from 'services/submission';
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
  useSubmitAssignment,
} from 'hooks/useAssignmentSubmission';
import useSaveSubmissionDraft from 'hooks/useSaveSubmissionDraft';
import { AssignmentSubmissionParamList } from 'navigation/types';

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
  const {
    title,
    deadline,
    lateSubmissionDeadline,
    submitTime,
    submittedAttachment,
    submittedContent,
  } = assignment;

  // What is being submitted and until when, as on the assignment's page.
  const now = useMinute();
  // How far off it is, except for a deadline over a year away, which
  // deadlineText gives as its date: that's already the first part.
  const deadlineDate = dayjs(deadline).format(t('fullDateTimeFormat'));
  const deadlineSubtitle = [
    dayjs(deadline).isAfter(dayjs(now).add(1, 'year'))
      ? deadlineDate
      : `${deadlineDate} · ${deadlineText(deadline, now)}`,
    lateSubmissionDeadline && !dayjs(now).isBefore(deadline)
      ? `${t('lateSubmission')} ${dayjs(lateSubmissionDeadline).format(t('fullDateTimeFormat'))}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

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

  // Not swiped away while uploading: back beside a list, or the sheet down.
  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !uploading });
    const parent = navigation.getParent();
    const parentState = parent?.getState();
    if (
      Platform.OS === 'ios' &&
      parentState?.routes[parentState.index]?.name ===
        'AssignmentSubmissionStack'
    ) {
      parent?.setOptions({ gestureEnabled: !uploading });
    }
  }, [navigation, uploading]);

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

  const handlePickerOpen = () => {
    handlePickerMenuOpen();
    showChoices({
      title: t('pickAttachment'),
      choices: [
        {
          label: t('documents'),
          onPress: () => {
            void handleDocumentPick();
          },
        },
        {
          label: t('photos'),
          onPress: () => {
            void handlePhotoPick();
          },
        },
      ],
      onCancel: handlePickerMenuClose,
    });
  };

  const showUploadError = useEffectEvent(() => {
    toast(t('assignmentSubmissionFailed'), 'error', { duration: 3000 });
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
        attachment: attachmentFile(assignment, attachment),
      });
    }
  };

  const submitDisabled = !canSubmit({
    uploading,
    removeAttachment,
    content,
    picked: attachmentResult,
  });

  useHeaderButtons(navigation, 'right', [
    {
      id: 'submit',
      label: t('submit'),
      icon: 'upload',
      text: true,
      disabled: submitDisabled,
      onPress: confirmSubmit,
    },
  ]);

  const pickLabel = attachmentResult
    ? t('reUploadAttachment')
    : submittedAttachment
      ? t('overwriteAttachment')
      : t('pickAttachment');

  return (
    <FormScreen>
      <Form testID="assignmentSubmission">
        <FormSection>
          <FormTitle
            title={title}
            subtitle={deadlineSubtitle}
            testID="submissionTitle"
          />
        </FormSection>
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
          footer={t('draftSaved')}
          footerHidden={!hasDraft}
        >
          <FormTextField
            multiline
            disabled={removeAttachment || uploading}
            placeholder={t('assignmentSubmissionContentPlaceholder')}
            label={t('submissionContent')}
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
              icon="file"
              struck={!!attachmentResult || removeAttachment}
              disabled={uploading}
              onPress={() => handleFileOpen(submittedAttachment)}
            />
          ) : null}
          {attachmentResult && !removeAttachment ? (
            <FormFile
              title={attachmentResult.name}
              icon="file"
              detail={isShared ? t('previouslyShared') : undefined}
              disabled={uploading}
              onPress={() =>
                handleFileOpen(pickedAsRemoteFile(attachmentResult))
              }
            />
          ) : null}
          {attachmentResult && !removeAttachment ? (
            <FormTextField
              plain
              disabled={uploading}
              placeholder={t('assignmentSubmissionFilenamePlaceholder')}
              label={t('assignmentSubmissionFilenamePlaceholder')}
              value={customAttachmentName}
              onChangeText={setCustomAttachmentName}
              format={sanitizeCustomAttachmentName}
              testID="submissionFilename"
            />
          ) : null}
          {!removeAttachment ? (
            <FormButton
              title={pickLabel}
              icon="addFile"
              disabled={uploading}
              onPress={handlePickerOpen}
              testID="pickAttachment"
            />
          ) : null}
          {attachmentResult && !removeAttachment ? (
            <FormButton
              title={t('removePickedAttachment')}
              icon="remove"
              disabled={uploading}
              onPress={handlePickedAttachmentRemove}
            />
          ) : null}
          {submittedAttachment ? (
            removeAttachment ? (
              <FormButton
                title={t('undoRemoveUploadedAttachment')}
                icon="undo"
                disabled={uploading}
                onPress={handleUploadedAttachmentRemove}
              />
            ) : (
              <FormButton
                title={t('removeUploadedAttachment')}
                icon="delete"
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
              title={t('discardDraftEllipsis')}
              icon="delete"
              disabled={uploading}
              onPress={handleDraftDiscard}
            />
          </FormSection>
        ) : null}
      </Form>
    </FormScreen>
  );
};

export default AssignmentSubmission;
