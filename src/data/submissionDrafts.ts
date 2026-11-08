import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Directory, File, Paths } from 'expo-file-system';
import mime from 'mime';
import { persistStorage } from 'data/storage';
import { getExtension } from 'helpers/filename';
import type { PickedAttachment } from 'helpers/submission';

export const SUBMISSION_DRAFTS_KEY = 'submissionDrafts';

/**
 * Folder under Documents that keeps the files of drafts. Picked files start
 * in Caches, which the system may empty, so a draft keeps its own copy.
 */
export const SUBMISSION_DRAFTS_DIR = 'SubmissionDrafts';

/** Drafts not touched for this long are dropped with their files. */
const MAX_AGE = 1000 * 60 * 60 * 24 * 180;

/** A picked file as a draft keeps it. */
interface DraftAttachment {
  /**
   * Path relative to Documents: the absolute path changes when iOS moves the
   * app container, as it does on updates.
   */
  path: string;
  name: string;
  type: string | null;
  size?: number | null;
}

/** An unsent submission, as the user left it. */
export interface SubmissionDraft {
  content: string;
  customAttachmentName: string;
  removeAttachment: boolean;
  attachment: DraftAttachment | null;
  savedAt: number;
}

/** What the submission screen restores from a draft. */
export interface RestoredSubmissionDraft {
  content: string;
  customAttachmentName: string;
  removeAttachment: boolean;
  picked: PickedAttachment | null;
}

/** Unsent submissions by assignment id. */
const useSubmissionDraftStore = create<{
  drafts: Record<string, SubmissionDraft>;
}>()(
  persist(() => ({ drafts: {} as Record<string, SubmissionDraft> }), {
    name: SUBMISSION_DRAFTS_KEY,
    version: 1,
    storage: persistStorage,
  }),
);

const draftsDirectory = () =>
  new Directory(Paths.document, SUBMISSION_DRAFTS_DIR);

const draftFile = (path: string) => new File(Paths.document, path);

const deleteQuietly = (item: File | Directory) => {
  try {
    if (item.exists) {
      item.delete();
    }
  } catch {}
};

/** Whether `uri` is already a draft's own copy. */
export const isDraftFile = (uri: string) =>
  uri.startsWith(draftsDirectory().uri.replace(/\/?$/, '/'));

/** Draft file names use only these, so a path and its URI read the same. */
const safeName = (name: string) => name.replace(/[^\w-]/g, '_');

const relativePath = (uri: string) =>
  `${SUBMISSION_DRAFTS_DIR}/${uri.slice(draftsDirectory().uri.replace(/\/?$/, '/').length)}`;

/** Keeps a copy of a picked file for the assignment's draft. */
export const keepDraftFile = async (
  assignmentId: string,
  picked: PickedAttachment,
): Promise<PickedAttachment> => {
  if (isDraftFile(picked.uri)) {
    return picked;
  }
  const dir = new Directory(draftsDirectory(), safeName(assignmentId));
  dir.create({ intermediates: true, idempotent: true });
  const ext =
    getExtension(picked.name) || mime.getExtension(picked.type ?? '') || 'bin';
  const to = new File(dir, `${Date.now()}.${safeName(ext)}`);
  await new File(picked.uri).copy(to);
  return { ...picked, uri: to.uri };
};

/** Deletes a kept copy that no draft ended up using. */
export const discardDraftFile = (picked: PickedAttachment) => {
  if (!isDraftFile(picked.uri)) {
    return;
  }
  const path = relativePath(picked.uri);
  const used = Object.values(useSubmissionDraftStore.getState().drafts).some(
    draft => draft.attachment?.path === path,
  );
  if (!used) {
    deleteQuietly(draftFile(path));
  }
};

const restore = (draft: SubmissionDraft): RestoredSubmissionDraft | null => {
  let picked: PickedAttachment | null = null;
  if (draft.attachment) {
    const file = draftFile(draft.attachment.path);
    if (file.exists) {
      const { path: _, ...rest } = draft.attachment;
      picked = { ...rest, uri: file.uri };
    }
  }
  const restored = {
    content: draft.content,
    customAttachmentName: picked ? draft.customAttachmentName : '',
    removeAttachment: draft.removeAttachment,
    picked,
  };
  return restored.content || restored.removeAttachment || restored.picked
    ? restored
    : null;
};

export const getSubmissionDraft = (assignmentId: string) => {
  const draft = useSubmissionDraftStore.getState().drafts[assignmentId];
  return draft ? restore(draft) : null;
};

export const useHasSubmissionDraft = (assignmentId: string) =>
  useSubmissionDraftStore(state => !!state.drafts[assignmentId]);

/** Files that no saved draft points to any more. */
const deleteUnusedFiles = (
  before: Record<string, SubmissionDraft>,
  after: Record<string, SubmissionDraft>,
) => {
  const used = new Set(
    Object.values(after).flatMap(draft =>
      draft.attachment ? [draft.attachment.path] : [],
    ),
  );
  Object.values(before).forEach(draft => {
    if (draft.attachment && !used.has(draft.attachment.path)) {
      deleteQuietly(draftFile(draft.attachment.path));
    }
  });
};

/**
 * Saves the assignment's draft, or drops it when `draft` is null. Also drops
 * drafts that have been left alone for months.
 */
export const saveSubmissionDraft = (
  assignmentId: string,
  draft: RestoredSubmissionDraft | null,
) => {
  const before = useSubmissionDraftStore.getState().drafts;
  const now = Date.now();
  const drafts = Object.fromEntries(
    Object.entries(before).filter(
      ([id, saved]) => id !== assignmentId && now - saved.savedAt < MAX_AGE,
    ),
  );
  if (draft) {
    const { picked, ...rest } = draft;
    drafts[assignmentId] = {
      ...rest,
      attachment:
        picked && isDraftFile(picked.uri)
          ? {
              path: relativePath(picked.uri),
              name: picked.name,
              type: picked.type,
              size: picked.size,
            }
          : null,
      savedAt: now,
    };
  }
  useSubmissionDraftStore.setState({ drafts });
  deleteUnusedFiles(before, drafts);
};

/** Forgets all drafts and their files, as on logging out. */
export const clearSubmissionDrafts = () => {
  useSubmissionDraftStore.setState({ drafts: {} });
  deleteQuietly(draftsDirectory());
};
