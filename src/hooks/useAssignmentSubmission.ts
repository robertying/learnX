import { useState } from 'react';
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
 */
export const useAttachmentPicker = (title: string) => {
  const pendingAssignmentData = usePendingAssignmentData();

  const [picked, setPicked] = useState<PickedAttachment | null>(null);
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
