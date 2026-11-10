import { act, renderHook } from '@testing-library/react-native';
import {
  discardDraftFile,
  keepDraftFile,
  RestoredSubmissionDraft,
  saveSubmissionDraft,
} from 'data/submissionDrafts';
import { PickedAttachment } from 'helpers/submission';
import { useSaveSubmissionDraft } from 'hooks/useAssignmentSubmission';

// The pickers are ESM only; this hook doesn't use them.
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('data/submissionDrafts', () => ({
  isDraftFile: (uri: string) => uri.startsWith('draft://'),
  keepDraftFile: jest.fn(),
  discardDraftFile: jest.fn(),
  saveSubmissionDraft: jest.fn(),
}));

const picked = (uri: string): PickedAttachment => ({
  uri,
  name: 'a.pdf',
  type: 'application/pdf',
});
const kept = picked('draft://a.pdf');

const empty: RestoredSubmissionDraft = {
  content: 'submitted',
  customAttachmentName: '',
  removeAttachment: false,
  picked: null,
};

const renderDraft = (draft: Partial<RestoredSubmissionDraft>) =>
  renderHook(
    (props: RestoredSubmissionDraft) =>
      useSaveSubmissionDraft('a1', props, 'submitted'),
    { initialProps: { ...empty, ...draft } },
  );

/** Resolves the copy that keepDraftFile was last asked for. */
const deferredCopy = () => {
  let resolve: (value: PickedAttachment) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  jest.mocked(keepDraftFile).mockReturnValueOnce(
    new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
  );
  return {
    resolve: (value: PickedAttachment) => act(async () => resolve(value)),
    reject: (error: unknown) => act(async () => reject(error)),
  };
};

it('drops the draft while it matches what was submitted', async () => {
  await renderDraft({});
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith('a1', null);
});

it('saves the text, and a file already kept for a draft, right away', async () => {
  await renderDraft({ content: 'edited', picked: kept });
  expect(keepDraftFile).not.toHaveBeenCalled();
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith('a1', {
    content: 'edited',
    customAttachmentName: '',
    removeAttachment: false,
    picked: kept,
  });
});

it('saves the text first, and the picked file once it is copied', async () => {
  const copy = deferredCopy();
  await renderDraft({ picked: picked('file://a.pdf') });
  expect(keepDraftFile).toHaveBeenCalledWith('a1', picked('file://a.pdf'));
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith(
    'a1',
    expect.objectContaining({ picked: null }),
  );
  await copy.resolve(kept);
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith(
    'a1',
    expect.objectContaining({ picked: kept }),
  );
  expect(discardDraftFile).not.toHaveBeenCalled();
});

it('copies the file once while the text changes, and saves the latest text with it', async () => {
  const copy = deferredCopy();
  const { rerender } = await renderDraft({ picked: picked('file://a.pdf') });
  await rerender({
    ...empty,
    content: 'typed',
    picked: picked('file://a.pdf'),
  });
  expect(keepDraftFile).toHaveBeenCalledTimes(1);
  await copy.resolve(kept);
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith(
    'a1',
    expect.objectContaining({ content: 'typed', picked: kept }),
  );
});

it('discards a copy of a file replaced while it was being copied', async () => {
  const first = deferredCopy();
  const { rerender } = await renderDraft({ picked: picked('file://a.pdf') });
  deferredCopy();
  await rerender({ ...empty, picked: picked('file://b.pdf') });
  await first.resolve(kept);
  expect(discardDraftFile).toHaveBeenCalledWith(kept);
});

it('copies again after a failed copy', async () => {
  const copy = deferredCopy();
  const { rerender } = await renderDraft({ picked: picked('file://a.pdf') });
  await copy.reject(new Error('disk full'));
  deferredCopy();
  await rerender({ ...empty, content: 'x', picked: picked('file://a.pdf') });
  expect(keepDraftFile).toHaveBeenCalledTimes(2);
});

it('drops the draft for good once stopped, discarding a copy still under way', async () => {
  const copy = deferredCopy();
  const { result, rerender } = await renderDraft({
    picked: picked('file://a.pdf'),
  });
  await act(async () => result.current.stop());
  expect(saveSubmissionDraft).toHaveBeenLastCalledWith('a1', null);
  jest.mocked(saveSubmissionDraft).mockClear();

  await copy.resolve(kept);
  expect(discardDraftFile).toHaveBeenCalledWith(kept);
  await rerender({ ...empty, content: 'after' });
  expect(saveSubmissionDraft).not.toHaveBeenCalled();
});
