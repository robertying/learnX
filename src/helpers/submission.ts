// Assignment submission helpers: attachment naming, what the submit button
// allows, and the upload itself. Used by hooks/useAssignmentSubmission.
import mime from 'mime';
import { RemoteFile } from 'thu-learn-lib';
import { submitAssignment } from 'data/source';
import { Assignment } from 'data/types/state';
import { getExtension, stripExtension } from './filename';
import { removeTags } from './text';

/** A file picked or shared for submission, not uploaded yet */
export interface PickedAttachment {
  uri: string;
  type: string | null;
  name: string;
  size?: number | null;
}

/** What the content input starts with: the submitted text, tags removed */
export const initialSubmissionContent = (submittedContent?: string) =>
  (removeTags(submittedContent || '') ?? '').replace('-->', '');

/** "<title>-提交.<ext>" or "<title> Submission.<ext>", ext from the MIME type */
export const defaultAttachmentName = (
  title: string,
  mimeType: string | null | undefined,
  chinese: boolean,
) => {
  const ext = mime.getExtension(mimeType ?? 'application/octet-stream');
  return chinese ? `${title}-提交.${ext}` : `${title} Submission.${ext}`;
};

/** Custom names get the picked file's extension, so dots are not allowed */
export const sanitizeCustomAttachmentName = (text: string) =>
  text.replaceAll('.', '');

/** The attachment to upload, renamed when a custom name was given */
export const uploadAttachment = (
  picked: PickedAttachment | null,
  customName: string,
) => {
  if (!picked) {
    return undefined;
  }
  const name = customName.trim();
  return {
    uri: picked.uri,
    name: name ? `${name}.${getExtension(picked.name)}` : picked.name,
  };
};

export const canSubmit = ({
  uploading,
  removeAttachment,
  content,
  picked,
}: {
  uploading: boolean;
  removeAttachment: boolean;
  content: string;
  picked: PickedAttachment | null;
}) => !uploading && (removeAttachment || !!content || !!picked);

/**
 * Sends the submission. Removing the uploaded attachment wins over new
 * content; with nothing to send it does nothing.
 */
export const sendSubmission = async ({
  studentHomeworkId,
  content,
  attachment,
  removeAttachment,
  onProgress,
}: {
  studentHomeworkId: string;
  content: string;
  attachment?: { uri: string; name: string };
  removeAttachment: boolean;
  onProgress: (progress: number) => void;
}) => {
  if (removeAttachment) {
    await submitAssignment(studentHomeworkId, '', undefined, onProgress, true);
  } else if (content || attachment) {
    await submitAssignment(studentHomeworkId, content, attachment, onProgress);
  }
};

/** A picked file shaped like a remote one, so it opens in file detail */
export const pickedAsRemoteFile = (
  picked: PickedAttachment,
): RemoteFile & { type?: string | null } => ({
  id: '0000',
  name: picked.name,
  downloadUrl: picked.uri,
  previewUrl: picked.uri,
  size: picked.size ? picked.size + 'B' : '',
  type: picked.type,
});

/** File detail params for a submitted or picked attachment */
export const attachmentForFileDetail = (
  assignment: Pick<Assignment, 'id' | 'courseName'>,
  attachment: RemoteFile & { type?: string | null },
) => ({
  id: assignment.id,
  courseName: assignment.courseName,
  title: stripExtension(attachment.name),
  downloadUrl: attachment.downloadUrl,
  fileType:
    (attachment.type
      ? mime.getExtension(attachment.type)
      : getExtension(attachment.name)) || '',
});
