import {
  clearSubmissionDrafts,
  discardDraftFile,
  getSubmissionDraft,
  isDraftFile,
  keepDraftFile,
  saveSubmissionDraft,
} from 'data/submissionDrafts';
import type { PickedAttachment } from 'helpers/submission';

/** Paths of the files that exist, as URIs. */
const mockFiles = new Set<string>();

// An in-memory file system: a file exists once it's copied or added here.
jest.mock('expo-file-system', () => {
  class Entry {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts
        .map(part => (typeof part === 'string' ? part : part.uri))
        .join('/')
        .replace(/(?<!:)\/{2,}/g, '/');
    }
    get exists() {
      return [...mockFiles].some(
        file => file === this.uri || file.startsWith(`${this.uri}/`),
      );
    }
    create() {}
    delete() {
      [...mockFiles]
        .filter(file => file === this.uri || file.startsWith(`${this.uri}/`))
        .forEach(file => mockFiles.delete(file));
    }
    async copy(to: Entry) {
      mockFiles.add(to.uri);
    }
  }
  return {
    File: Entry,
    Directory: Entry,
    Paths: { document: new Entry('file:///document/') },
  };
});

const picked: PickedAttachment = {
  uri: 'file:///cache/answer.pdf',
  type: 'application/pdf',
  name: 'Answer.pdf',
  size: 1024,
};

const draft = (attachment: PickedAttachment | null) => ({
  content: 'my answer',
  customAttachmentName: 'Final',
  removeAttachment: false,
  picked: attachment,
});

let now = 1_800_000_000_000;

beforeEach(() => {
  clearSubmissionDrafts();
  mockFiles.clear();
  mockFiles.add(picked.uri);
  jest.spyOn(Date, 'now').mockImplementation(() => now++);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('submission drafts', () => {
  it('keeps its own copy of a picked file and restores the draft with it', async () => {
    const kept = await keepDraftFile('hw/1', picked);
    expect(isDraftFile(kept.uri)).toBe(true);
    expect(kept.uri).toMatch(/\/SubmissionDrafts\/hw_1\/\d+\.pdf$/);
    expect(mockFiles.has(kept.uri)).toBe(true);
    // Keeping it again doesn't copy it twice.
    await expect(keepDraftFile('hw/1', kept)).resolves.toBe(kept);

    saveSubmissionDraft('hw/1', draft(kept));
    expect(getSubmissionDraft('hw/1')).toEqual(draft(kept));
  });

  it('forgets the attachment, and its name, when its file is gone', async () => {
    const kept = await keepDraftFile('hw1', picked);
    saveSubmissionDraft('hw1', draft(kept));
    mockFiles.delete(kept.uri);
    expect(getSubmissionDraft('hw1')).toEqual({
      ...draft(null),
      customAttachmentName: '',
    });
  });

  it('keeps no attachment that is not its own copy', () => {
    saveSubmissionDraft('hw1', draft(picked));
    expect(getSubmissionDraft('hw1')?.picked).toBeNull();
  });

  it('deletes the copy a draft no longer uses', async () => {
    const first = await keepDraftFile('hw1', picked);
    saveSubmissionDraft('hw1', draft(first));
    const second = await keepDraftFile('hw1', picked);
    saveSubmissionDraft('hw1', draft(second));
    expect(mockFiles.has(first.uri)).toBe(false);
    expect(mockFiles.has(second.uri)).toBe(true);

    saveSubmissionDraft('hw1', null);
    expect(getSubmissionDraft('hw1')).toBeNull();
    expect(mockFiles.has(second.uri)).toBe(false);
  });

  it('discards a kept copy only when no draft uses it', async () => {
    const used = await keepDraftFile('hw1', picked);
    saveSubmissionDraft('hw1', draft(used));
    discardDraftFile(used);
    expect(mockFiles.has(used.uri)).toBe(true);

    const unused = await keepDraftFile('hw1', picked);
    discardDraftFile(unused);
    expect(mockFiles.has(unused.uri)).toBe(false);
  });

  it('drops drafts left alone for half a year, with their files', async () => {
    const old = await keepDraftFile('old', picked);
    saveSubmissionDraft('old', draft(old));
    now += 181 * 24 * 60 * 60 * 1000;
    saveSubmissionDraft('new', draft(null));
    expect(getSubmissionDraft('old')).toBeNull();
    expect(mockFiles.has(old.uri)).toBe(false);
    expect(getSubmissionDraft('new')).not.toBeNull();
  });

  it('drops a draft with nothing in it', () => {
    saveSubmissionDraft('hw1', {
      content: '',
      customAttachmentName: '',
      removeAttachment: false,
      picked: null,
    });
    expect(getSubmissionDraft('hw1')).toBeNull();
  });

  it('forgets every draft and file on logout', async () => {
    const kept = await keepDraftFile('hw1', picked);
    saveSubmissionDraft('hw1', draft(kept));
    clearSubmissionDrafts();
    expect(getSubmissionDraft('hw1')).toBeNull();
    expect(mockFiles.has(kept.uri)).toBe(false);
  });
});
