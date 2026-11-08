import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'components/Toast';
import { refreshCourseAssignments } from 'data/content';
import {
  setPendingAssignmentData,
  usePendingAssignmentData,
} from 'data/pendingAssignment';
import {
  discardDraftFile,
  isDraftFile,
  keepDraftFile,
  RestoredSubmissionDraft,
  saveSubmissionDraft,
} from 'data/submissionDrafts';
import { Assignment } from 'data/types/state';
import { getUserData } from 'data/userData';
import { isLocaleChinese, t } from 'helpers/i18n';
import {
  PickedAttachment,
  defaultAttachmentName,
  sendSubmission,
  uploadAttachment,
} from 'helpers/submission';

/**
 * The attachment to submit: picked from documents or photos, or shared to the
 * app (pending assignment data). Picking a file replaces a shared one.
 * Starts with `initialPicked`, the file of a saved draft.
 */
export const useAttachmentPicker = (
  title: string,
  initialPicked: PickedAttachment | null = null,
) => {
  const pendingAssignmentData = usePendingAssignmentData();

  const [picked, setPicked] = useState<PickedAttachment | null>(initialPicked);
  const [menuVisible, setMenuVisible] = useState(false);

  const defaultName = (mimeType?: string | null) =>
    defaultAttachmentName(title, mimeType, isLocaleChinese());

  const openMenu = () => {
    Keyboard.dismiss();
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const pickDocument = async () => {
    closeMenu();
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

    setPicked({
      uri: file.uri,
      type: file.mimeType ?? null,
      name: file.name ?? defaultName(file.mimeType),
      size: file.size,
    });
    setPendingAssignmentData(null);
  };

  const pickPhoto = async () => {
    closeMenu();
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

    setPicked({
      uri: photo.uri,
      type: photo.mimeType ?? null,
      name: defaultName(photo.mimeType),
      size: photo.fileSize,
    });
    setPendingAssignmentData(null);
  };

  const removePicked = () => {
    setPicked(null);
    setPendingAssignmentData(null);
  };

  // A file shared to the app becomes the attachment.
  const [sharedAssignmentData, setSharedAssignmentData] =
    useState<typeof pendingAssignmentData>(null);
  if (pendingAssignmentData !== sharedAssignmentData) {
    setSharedAssignmentData(pendingAssignmentData);
    if (pendingAssignmentData) {
      setPicked({
        uri: pendingAssignmentData.data,
        type: pendingAssignmentData.mimeType,
        name: defaultName(pendingAssignmentData.mimeType),
      });
    }
  }

  return {
    picked,
    /** The picked file came from a share, not from the pickers */
    isShared: !!pendingAssignmentData,
    menuVisible,
    openMenu,
    closeMenu,
    pickDocument,
    pickPhoto,
    removePicked,
  };
};

/**
 * Saves the submission as a draft whenever it changes, so it survives leaving
 * the screen and restarting the app. A picked file is copied for the draft
 * first. A submission that matches what was submitted drops the draft.
 * `stop` drops the draft and saves no more, for after submitting.
 */
export const useSaveSubmissionDraft = (
  assignmentId: string,
  {
    content,
    customAttachmentName,
    removeAttachment,
    picked,
  }: RestoredSubmissionDraft,
  submittedContent: string,
) => {
  const stopped = useRef(false);
  // The copy being made of the picked file, by the picked file's URI. Kept
  // while the text changes, so typing doesn't copy the file again.
  const copying = useRef<{
    from: string;
    copy: Promise<PickedAttachment>;
  } | null>(null);

  useEffect(() => {
    if (stopped.current) {
      return;
    }
    if (
      content === submittedContent &&
      !removeAttachment &&
      !picked &&
      !customAttachmentName
    ) {
      saveSubmissionDraft(assignmentId, null);
      return;
    }

    const draft = { content, customAttachmentName, removeAttachment };
    if (!picked || isDraftFile(picked.uri)) {
      saveSubmissionDraft(assignmentId, { ...draft, picked });
      return;
    }

    if (copying.current?.from !== picked.uri) {
      // Save the text now and the file once it is copied.
      saveSubmissionDraft(assignmentId, { ...draft, picked: null });
      const from = picked.uri;
      const copy = keepDraftFile(assignmentId, picked);
      copying.current = { from, copy };
      copy
        .then(kept => {
          // Picked something else, or submitted, while copying.
          if (stopped.current || copying.current?.from !== from) {
            discardDraftFile(kept);
          }
        })
        .catch(() => {
          if (copying.current?.from === from) {
            copying.current = null;
          }
        });
    }

    let cancelled = false;
    copying.current?.copy
      .then(kept => {
        if (!cancelled && !stopped.current) {
          saveSubmissionDraft(assignmentId, { ...draft, picked: kept });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    assignmentId,
    content,
    customAttachmentName,
    removeAttachment,
    picked,
    submittedContent,
  ]);

  return {
    stop: () => {
      stopped.current = true;
      saveSubmissionDraft(assignmentId, null);
    },
  };
};

/**
 * Uploads the submission after a confirmation alert. On success it clears
 * shared data, refreshes the course's assignments and calls `onSubmitted`.
 */
export const useSubmitAssignment = (
  assignment: Pick<Assignment, 'courseId' | 'studentHomeworkId'>,
  {
    content,
    picked,
    customAttachmentName,
    removeAttachment,
  }: {
    content: string;
    picked: PickedAttachment | null;
    customAttachmentName: string;
    removeAttachment: boolean;
  },
  onSubmitted: () => void,
) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [progress, setProgress] = useState(0);

  const submit = async () => {
    setUploadError(false);
    setUploading(true);

    // Kept out of the try block: React Compiler can't compile conditional
    // expressions inside one.
    const attachment = uploadAttachment(picked, customAttachmentName);

    try {
      await sendSubmission({
        studentHomeworkId: assignment.studentHomeworkId,
        content,
        attachment,
        removeAttachment,
        onProgress: setProgress,
      });
    } catch {
      setUploading(false);
      setUploadError(true);
      setProgress(0);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setUploading(false);
    setProgress(0);

    setPendingAssignmentData(null);
    const semesterId = getUserData().currentSemester;
    if (semesterId) {
      refreshCourseAssignments(semesterId, assignment.courseId).catch(() => {});
    }

    toast(t('assignmentSubmissionSucceeded'), 'success');
    onSubmitted();
  };

  const confirmSubmit = () => {
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
          onPress: submit,
        },
      ],
      { cancelable: true },
    );
  };

  return {
    uploading,
    uploadError,
    dismissUploadError: () => setUploadError(false),
    progress,
    confirmSubmit,
  };
};
