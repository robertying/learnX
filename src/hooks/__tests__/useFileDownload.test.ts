import { Linking, Platform } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { toast } from 'components/Toast';
import { setSetting } from 'data/settings';
import { DownloadableFile } from 'data/types/state';
import {
  copyFileToMacDownloads,
  downloadFile,
  openFile,
  shareFile,
} from 'helpers/fs';
import useFileDownload from 'hooks/useFileDownload';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('helpers/fs', () => ({
  copyFileToMacDownloads: jest.fn(),
  downloadFile: jest.fn(),
  openFile: jest.fn(),
  shareFile: jest.fn(),
}));

const file: DownloadableFile = {
  id: 'f1',
  courseName: 'Calculus',
  title: 'Lecture 1',
  fileType: 'docx',
  downloadUrl: 'https://example.com/f1',
};

const PATH = 'file:///cache/Calculus/Lecture 1.docx';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(downloadFile).mockResolvedValue(PATH);
  setSetting('openFileAfterDownload', false);
});

const setup = async (input: DownloadableFile = file) => {
  const hook = await renderHook(useFileDownload, { initialProps: input });
  await waitFor(() => expect(downloadFile).toHaveBeenCalled());
  return hook;
};

describe('useFileDownload', () => {
  it('downloads from the cache on mount', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.path).toBe(PATH));
    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(
      file,
      false,
      expect.any(Function),
    );
    expect(result.current.error).toBe(false);
  });

  it('reports progress, then resets it when done', async () => {
    let finish: (path: string) => void = () => {};
    let report: (progress: number) => void = () => {};
    jest
      .mocked(downloadFile)
      .mockImplementationOnce((_file, _refresh, onProgress) => {
        report = onProgress!;
        return new Promise(resolve => {
          finish = resolve;
        });
      });
    const { result } = await setup();

    await act(() => report(0.5));
    expect(result.current.progress).toBe(0.5);

    await act(() => finish(PATH));
    expect(result.current.progress).toBe(0);
    expect(result.current.path).toBe(PATH);
  });

  it('shows an error and a toast when the download fails', async () => {
    jest.mocked(downloadFile).mockRejectedValueOnce(new Error('Network'));
    const { result } = await setup();
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.path).toBe('');
    expect(toast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('re-downloads past the cache and clears the error', async () => {
    jest.mocked(downloadFile).mockRejectedValueOnce(new Error('Network'));
    const { result } = await setup();
    await waitFor(() => expect(result.current.error).toBe(true));

    await act(() => result.current.redownload());
    expect(downloadFile).toHaveBeenLastCalledWith(
      file,
      true,
      expect.any(Function),
    );
    await waitFor(() => expect(result.current.path).toBe(PATH));
    expect(result.current.error).toBe(false);
  });

  it('keeps the file from the first render', async () => {
    const { rerender } = await setup();
    await rerender({ ...file, downloadUrl: 'https://example.com/other' });
    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(jest.mocked(downloadFile).mock.calls[0][0]).toEqual(file);
  });

  it('shares the file', async () => {
    const { result } = await setup();
    await act(() => result.current.share());
    expect(shareFile).toHaveBeenCalledWith(file);
  });

  it('copies to Downloads and says how it went', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.path).toBe(PATH));

    await act(() => result.current.copyToDownloads());
    expect(copyFileToMacDownloads).toHaveBeenCalledWith(file, PATH);
    expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    jest.mocked(copyFileToMacDownloads).mockRejectedValueOnce(new Error());
    await act(() => result.current.copyToDownloads());
    expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'error');
  });

  it('opens the downloaded file by URL on iOS', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const { result } = await setup();
    await waitFor(() => expect(result.current.path).toBe(PATH));

    await act(() => result.current.open());
    expect(openURL).toHaveBeenCalledWith(PATH);
    expect(openFile).not.toHaveBeenCalled();

    openURL.mockRejectedValueOnce(new Error());
    await act(() => result.current.open());
    expect(toast).toHaveBeenLastCalledWith(expect.any(String), 'error');
  });

  describe('on Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('opens with the file type', async () => {
      const { result } = await setup();
      await waitFor(() => expect(result.current.path).toBe(PATH));
      await act(() => result.current.open());
      expect(openFile).toHaveBeenCalledWith(PATH, 'docx');
    });

    it('opens the file after download when the setting is on', async () => {
      setSetting('openFileAfterDownload', true);
      await setup();
      await waitFor(() => expect(openFile).toHaveBeenCalledWith(PATH, 'docx'));
    });

    it('does not open PDFs after download, they preview inline', async () => {
      setSetting('openFileAfterDownload', true);
      const { result } = await setup({ ...file, fileType: 'pdf' });
      await waitFor(() => expect(result.current.path).toBe(PATH));
      expect(openFile).not.toHaveBeenCalled();
    });

    it('does not open after download when the setting is off', async () => {
      const { result } = await setup();
      await waitFor(() => expect(result.current.path).toBe(PATH));
      expect(openFile).not.toHaveBeenCalled();
    });
  });
});
