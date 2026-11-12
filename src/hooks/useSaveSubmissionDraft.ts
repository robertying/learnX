import { useEffect, useRef } from 'react';
import {
  discardDraftFile,
  isDraftFile,
  keepDraftFile,
  RestoredSubmissionDraft,
  saveSubmissionDraft,
} from 'data/submissionDrafts';
import { PickedAttachment } from 'services/submission';

/**
 * Saves the submission as a draft whenever it changes, so it survives leaving
 * the screen and restarting the app. A picked file is copied for the draft
 * first. A submission that matches what was submitted drops the draft.
 * `stop` drops the draft and saves no more, for after submitting.
 */
const useSaveSubmissionDraft = (
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

export default useSaveSubmissionDraft;
