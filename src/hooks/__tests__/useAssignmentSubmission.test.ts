import { Alert, AlertButton } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'components/Toast';
import { refreshCourseAssignments } from 'data/content';
import {
  setPendingAssignmentData,
  usePendingAssignmentStore,
} from 'data/pendingAssignment';
import { submitAssignment } from 'data/source';
import { resetUserData, setCurrentSemester } from 'data/userData';
import { PickedAttachment } from 'helpers/submission';
import {
  useAttachmentPicker,
  useSubmitAssignment,
} from 'hooks/useAssignmentSubmission';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('data/content', () => ({ refreshCourseAssignments: jest.fn() }));
jest.mock('data/source', () => ({ submitAssignment: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const getDocument = jest.mocked(DocumentPicker.getDocumentAsync);
const launchLibrary = jest.mocked(ImagePicker.launchImageLibraryAsync);

beforeEach(() => {
  usePendingAssignmentStore.setState({ data: null });
  jest.mocked(refreshCourseAssignments).mockResolvedValue(undefined as never);
});

describe('useAttachmentPicker', () => {
  const setup = () => renderHook(() => useAttachmentPicker('HW1'));

  it('picks a document and closes the menu', async () => {
    getDocument.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///doc.pdf',
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 10,
          lastModified: 0,
        },
      ],
    });
    const { result } = await setup();

    await act(() => result.current.openMenu());
    expect(result.current.menuVisible).toBe(true);

    await act(() => result.current.pickDocument());
    expect(result.current.menuVisible).toBe(false);
    expect(result.current.picked).toEqual({
      uri: 'file:///doc.pdf',
      type: 'application/pdf',
      name: 'doc.pdf',
      size: 10,
    });
  });

  it('names a photo after the assignment', async () => {
    launchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///photo.jpg',
          mimeType: 'image/jpeg',
          fileSize: 20,
          width: 1,
          height: 1,
        },
      ],
    });
    const { result } = await setup();

    await act(() => result.current.pickPhoto());
    expect(result.current.picked).toEqual({
      uri: 'file:///photo.jpg',
      type: 'image/jpeg',
      name: 'HW1 Submission.jpg',
      size: 20,
    });
  });

  it('keeps nothing when the picker is canceled', async () => {
    getDocument.mockResolvedValueOnce({ canceled: true, assets: null });
    const { result } = await setup();
    await act(() => result.current.pickDocument());
    expect(result.current.picked).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows a toast when the picker fails', async () => {
    launchLibrary.mockRejectedValueOnce(new Error('denied'));
    const { result } = await setup();
    await act(() => result.current.pickPhoto());
    expect(result.current.picked).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('attaches a file shared to the app', async () => {
    const { result } = await setup();
    expect(result.current.isShared).toBe(false);

    await act(() =>
      setPendingAssignmentData({
        data: 'file:///shared.png',
        mimeType: 'image/png',
      }),
    );
    expect(result.current.isShared).toBe(true);
    expect(result.current.picked).toEqual({
      uri: 'file:///shared.png',
      type: 'image/png',
      name: 'HW1 Submission.png',
    });
  });

  it('replaces a shared file with a picked one', async () => {
    getDocument.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///doc.pdf', name: 'doc.pdf', lastModified: 0 }],
    });
    const { result } = await setup();
    await act(() =>
      setPendingAssignmentData({
        data: 'file:///shared.png',
        mimeType: 'image/png',
      }),
    );

    await act(() => result.current.pickDocument());
    expect(result.current.isShared).toBe(false);
    expect(usePendingAssignmentStore.getState().data).toBeNull();
    expect(result.current.picked?.uri).toBe('file:///doc.pdf');
  });

  it('removes the picked file and the shared data', async () => {
    const { result } = await setup();
    await act(() =>
      setPendingAssignmentData({
        data: 'file:///shared.png',
        mimeType: 'image/png',
      }),
    );

    await act(() => result.current.removePicked());
    expect(result.current.picked).toBeNull();
    expect(result.current.isShared).toBe(false);
  });
});

describe('useSubmitAssignment', () => {
  const assignment = { courseId: 'c1', id: 'hw1' };
  const picked: PickedAttachment = {
    uri: 'file:///doc.pdf',
    type: 'application/pdf',
    name: 'doc.pdf',
  };

  const setup = (
    input: Partial<Parameters<typeof useSubmitAssignment>[1]> = {},
  ) => {
    const onSubmitted = jest.fn();
    return renderHook(() =>
      useSubmitAssignment(
        assignment,
        {
          content: 'answer',
          picked: null,
          customAttachmentName: '',
          removeAttachment: false,
          ...input,
        },
        onSubmitted,
      ),
    ).then(hook => ({ ...hook, onSubmitted }));
  };

  /** Confirms the alert that `confirmSubmit` shows */
  const confirm = async (confirmSubmit: () => void) => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    confirmSubmit();
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    alert.mockRestore();
    await act(async () => {
      await buttons[1].onPress?.();
    });
  };

  beforeEach(() => {
    resetUserData();
    setCurrentSemester('2026-2027-1');
  });

  it('asks before submitting and does nothing on cancel', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = await setup();
    result.current.confirmSubmit();
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons[0].style).toBe('cancel');
    expect(submitAssignment).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('uploads with the custom name, then refreshes and reports back', async () => {
    const { result, onSubmitted } = await setup({
      picked,
      customAttachmentName: 'Final',
    });
    await confirm(result.current.confirmSubmit);

    expect(submitAssignment).toHaveBeenCalledWith('hw1', {
      content: '<p>answer</p>',
      attachment: { uri: picked.uri, name: 'Final.pdf' },
      onProgress: expect.any(Function),
      remove: false,
    });
    expect(refreshCourseAssignments).toHaveBeenCalledWith('2026-2027-1', 'c1');
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(onSubmitted).toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it('clears shared data after a successful submit', async () => {
    setPendingAssignmentData({ data: 'file:///shared.png', mimeType: 'x' });
    const { result } = await setup();
    await confirm(result.current.confirmSubmit);
    expect(usePendingAssignmentStore.getState().data).toBeNull();
  });

  it('removes the uploaded attachment when asked', async () => {
    const { result } = await setup({ removeAttachment: true });
    await confirm(result.current.confirmSubmit);
    // the answer stays: the server replaces the submitted one with what's sent
    expect(submitAssignment).toHaveBeenCalledWith('hw1', {
      content: '<p>answer</p>',
      attachment: undefined,
      onProgress: expect.any(Function),
      remove: true,
    });
  });

  it('shows uploading and progress while sending', async () => {
    let finish: () => void = () => {};
    let report: (progress: number) => void = () => {};
    jest
      .mocked(submitAssignment)
      .mockImplementationOnce((_id, { onProgress }) => {
        report = onProgress!;
        return new Promise(resolve => {
          finish = () => resolve(undefined as never);
        });
      });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = await setup();
    result.current.confirmSubmit();
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    alert.mockRestore();

    await act(() => {
      buttons[1].onPress?.();
    });
    expect(result.current.uploading).toBe(true);

    await act(() => report(0.4));
    expect(result.current.progress).toBe(0.4);

    await act(() => finish());
    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('shows an error and keeps the form when the upload fails', async () => {
    jest.mocked(submitAssignment).mockRejectedValueOnce(new Error('Network'));
    setPendingAssignmentData({ data: 'file:///shared.png', mimeType: 'x' });
    const { result, onSubmitted } = await setup();
    await confirm(result.current.confirmSubmit);

    expect(result.current.uploadError).toBe(true);
    expect(result.current.uploading).toBe(false);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(refreshCourseAssignments).not.toHaveBeenCalled();
    expect(usePendingAssignmentStore.getState().data).not.toBeNull();

    await act(() => result.current.dismissUploadError());
    expect(result.current.uploadError).toBe(false);
  });

  it('skips the refresh without a current semester', async () => {
    resetUserData();
    const { result, onSubmitted } = await setup();
    await confirm(result.current.confirmSubmit);
    expect(refreshCourseAssignments).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalled();
  });
});
