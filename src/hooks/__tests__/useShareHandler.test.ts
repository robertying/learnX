import { Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Share, { type SharedItem } from 'modules/share';
import { toast } from 'components/Toast';
import { copyFileToCache } from 'services/files/share';
import { usePendingAssignmentStore } from 'data/pendingAssignment';
import useShareHandler from 'hooks/useShareHandler';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('services/files/share', () => ({ copyFileToCache: jest.fn() }));

const share = Share!;
let listener: ((item: SharedItem) => void) | undefined;
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  listener = undefined;
  usePendingAssignmentStore.setState({ data: null });
  jest.mocked(share.takeSharedItem).mockReturnValue(null);
  jest.mocked(share.addListener).mockImplementation((_event, l) => {
    listener = l as (item: SharedItem) => void;
    return { remove: jest.fn() };
  });
});

const file: SharedItem = {
  kind: 'file',
  uri: 'file:///group/Library/Caches/a/Report.pdf',
  mimeType: 'application/pdf',
};

describe('useShareHandler', () => {
  it('keeps the file that launched the app', async () => {
    jest.mocked(share.takeSharedItem).mockReturnValue(file);
    await renderHook(() => useShareHandler());
    await act(async () => {});
    expect(usePendingAssignmentStore.getState().data).toEqual({
      data: file.uri,
      mimeType: 'application/pdf',
    });
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'success', {
      duration: 5000,
    });
  });

  it('keeps a file shared while running', async () => {
    await renderHook(() => useShareHandler());
    await act(async () => listener!(file));
    expect(usePendingAssignmentStore.getState().data?.data).toBe(file.uri);
  });

  it('copies an Android share out of its content URI', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(copyFileToCache).mockResolvedValue('file:///cache/Report.pdf');
    await renderHook(() => useShareHandler());
    await act(async () => listener!({ ...file, uri: 'content://x/1' }));
    expect(copyFileToCache).toHaveBeenCalledWith('content://x/1');
    expect(usePendingAssignmentStore.getState().data?.data).toBe(
      'file:///cache/Report.pdf',
    );
  });

  it('says only files can be attached for text', async () => {
    await renderHook(() => useShareHandler());
    await act(async () => listener!({ kind: 'unsupported' }));
    expect(usePendingAssignmentStore.getState().data).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error', {
      duration: 3000,
    });
  });
});
