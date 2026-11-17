import { useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'components/Toast';
import { refreshCourseAssignments } from 'data/content';
import { addNotifiedKeys } from 'data/notified';
import {
  setPendingAssignmentData,
  usePendingAssignmentData,
} from 'data/pendingAssignment';
import { Assignment } from 'data/types/state';
import type { PickedAttachment } from 'data/submissionDrafts';
import { getUserData } from 'data/userData';
import { groupSubmittedKey } from 'helpers/contentNotifications';
import { isLocaleChinese, t } from 'helpers/i18n';
import {
  defaultAttachmentName,
  sendSubmission,
  uploadAttachment,
} from 'services/submission';

/**
 * The attachment to submit: picked from documents or photos, dropped on the
 * screen (Electron), or shared to the app (pending assignment data). A shared file goes to the one submission
 * screen that takes it first (open, or the next one opened), and no other.
 * Picking a file replaces a shared one. Starts with `initialPicked`, the file
 * of a saved draft.
 */
export const useAttachmentPicker = (
  title: string,
  initialPicked: PickedAttachment | null = null,
) => {
  const pendingAssignmentData = usePendingAssignmentData();

  const [picked, setPicked] = useState<PickedAttachment | null>(initialPicked);

  const defaultName = (mimeType?: string | null) =>
    defaultAttachmentName(title, mimeType, isLocaleChinese());

  const pickDocument = async () => {
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
  };

  const pickPhoto = async () => {
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
  };

  /** A file dropped on the screen (Electron), already in the cache. */
  const pickDropped = (file: PickedAttachment) => setPicked(file);

  const removePicked = () => setPicked(null);

  // A file shared to the app becomes the attachment, and is taken: another
  // assignment's screen won't attach it too.
  const [shared, setShared] = useState<typeof pendingAssignmentData>(null);
  if (pendingAssignmentData && pendingAssignmentData !== shared) {
    setShared(pendingAssignmentData);
    setPicked({
      uri: pendingAssignmentData.data,
      type: pendingAssignmentData.mimeType,
      name: defaultName(pendingAssignmentData.mimeType),
    });
  }
  useEffect(() => {
    if (pendingAssignmentData) {
      setPendingAssignmentData(null);
    }
  }, [pendingAssignmentData]);

  return {
    picked,
    /** The picked file came from a share, not from the pickers */
    isShared: !!shared && picked?.uri === shared.data,
    pickDocument,
    pickPhoto,
    pickDropped,
    removePicked,
  };
};

/**
 * Uploads the submission after a confirmation alert. On success it refreshes
 * the course's assignments and calls `onSubmitted`; on failure it says so and
 * leaves the form as it was.
 */
export const useSubmitAssignment = (
  assignment: Pick<Assignment, 'courseId' | 'id' | 'submittedContent'>,
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
  const [progress, setProgress] = useState(0);

  const submit = async () => {
    setUploading(true);

    // Kept out of the try block: React Compiler can't compile conditional
    // expressions inside one.
    const attachment = uploadAttachment(picked, customAttachmentName);

    try {
      await sendSubmission({
        studentHomeworkId: assignment.id,
        content,
        submittedContent: assignment.submittedContent,
        attachment,
        removeAttachment,
        onProgress: setProgress,
      });
    } catch {
      setUploading(false);
      setProgress(0);
      toast(t('assignmentSubmissionFailed'), 'error', { duration: 3000 });
      return;
    }

    setUploading(false);
    setProgress(0);

    // Submitted here, so a sync doesn't say the group submitted it.
    addNotifiedKeys([groupSubmittedKey(assignment.id)]);
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
          text: t('submit'),
          onPress: submit,
        },
      ],
      { cancelable: true },
    );
  };

  return { uploading, progress, confirmSubmit };
};
