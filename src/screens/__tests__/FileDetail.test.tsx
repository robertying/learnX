import { Platform } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { markFileSeen } from 'data/content';
import { mockFiles } from 'data/mock';
import type { File } from 'data/types/state';
import { t } from 'helpers/i18n';
import useFileDetailHeader from 'hooks/useFileDetailHeader';
import useFileDownload from 'hooks/useFileDownload';
import FileDetail from 'screens/FileDetail';
import { screenProps } from 'test-utils/screenProps';

let mockFile: File | undefined;
jest.mock('data/content', () => ({
  useFile: () => mockFile,
  markFileSeen: jest.fn(),
}));
jest.mock('hooks/useFileDownload', () => jest.fn());
jest.mock('hooks/useFileDetailHeader', () => jest.fn());
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: {
      style: object;
      decelerationRate?: string;
      javaScriptEnabled?: boolean;
    }) => (
      <View
        testID="webview"
        style={props.style}
        {...{
          decelerationRate: props.decelerationRate,
          javaScriptEnabled: props.javaScriptEnabled,
        }}
      />
    ),
  };
});
jest.mock('react-native-pdf', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="pdf" /> };
});

const download = {
  path: '',
  progress: 0,
  error: false,
  redownload: jest.fn(),
  share: jest.fn(),
  save: jest.fn(),
  open: jest.fn(),
};
const downloaded = (overrides: Partial<typeof download> = {}) =>
  jest
    .mocked(useFileDownload)
    .mockReturnValue({ ...download, ...overrides } as never);

const pdf = mockFiles.find(f => f.fileType === 'pdf')!;
const zip = { ...pdf, id: 'zip', fileType: 'zip' };

const navigation = { setOptions: jest.fn() };
const renderScreen = (params: object) =>
  render(<FileDetail {...screenProps({ navigation, route: { params } })} />);
beforeEach(() => {
  mockFile = pdf;
  downloaded();
});

it('shows Not Found for a file no longer listed', async () => {
  mockFile = undefined;
  await renderScreen({ id: 'gone' });
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
});

it('shows progress while downloading, then the PDF, marking it seen', async () => {
  downloaded({ progress: 0.3 });
  await renderScreen({ id: pdf.id });
  expect(screen.queryByTestId('pdf')).toBeNull();
  expect(markFileSeen).not.toHaveBeenCalled();
  expect(navigation.setOptions).toHaveBeenCalledWith(
    expect.objectContaining({ title: pdf.title }),
  );

  downloaded({ path: 'file:///a.pdf' });
  await renderScreen({ id: pdf.id });
  expect(screen.getByTestId('pdf')).toBeTruthy();
  expect(markFileSeen).toHaveBeenCalledWith(pdf.id);
});

it('says when the download failed', async () => {
  downloaded({ error: true });
  await renderScreen({ id: pdf.id });
  expect(screen.getByText(t('fileDownloadFailed'))).toBeTruthy();
});

it("previews other kinds in a web view and an attachment isn't marked seen", async () => {
  downloaded({ path: 'file:///a.html' });
  await renderScreen({
    attachment: { ...zip, fileType: 'html', downloadUrl: 'https://x' },
  });
  // A downloaded page's scripts don't run.
  expect(screen.getByTestId('webview')).toHaveProp('javaScriptEnabled', false);
  expect(markFileSeen).not.toHaveBeenCalled();
});

it('switches to the info page from the header', async () => {
  downloaded({ path: 'file:///a.pdf' });
  await renderScreen({ id: pdf.id });
  const { onToggleInfo, canRender } =
    jest.mocked(useFileDetailHeader).mock.lastCall![0];
  expect(canRender).toBe(true);
  await act(() => onToggleInfo());
  expect(screen.getByTestId('file-info')).toBeTruthy();
  expect(screen.queryByTestId('pdf')).toBeNull();
});

it("shows the info of a file it can't preview, with what to do with it", async () => {
  mockFile = zip;
  downloaded({ path: 'file:///a.zip' });
  await renderScreen({ id: zip.id });
  expect(screen.getByText(t('fileType'))).toBeTruthy();
  expect(screen.getByText('ZIP', { exact: false })).toBeTruthy();
  await userEvent.press(screen.getByText(t('share')));
  expect(download.share).toHaveBeenCalled();
  expect(screen.queryByText(t('open'))).toBeNull();
  expect(screen.queryByText(t('download'))).toBeNull();
});

it('offers download on the Mac and open on Android', async () => {
  const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  jest.replaceProperty(Platform, 'OS', 'android');
  mockFile = { ...zip, description: '', size: undefined } as never;
  downloaded({ path: 'file:///a.zip' });
  await renderScreen({ id: zip.id });
  const user = userEvent.setup();
  await user.press(screen.getByText(t('download')));
  expect(download.save).toHaveBeenCalled();
  await user.press(screen.getByText(t('open')));
  expect(download.open).toHaveBeenCalled();
  expect(screen.getByText(t('noFileDescription'))).toBeTruthy();
  isMac.mockRestore();
});

it('previews office documents on white, as they are drawn for paper', async () => {
  downloaded({ path: 'file:///a.docx' });
  await renderScreen({
    attachment: { ...zip, fileType: 'docx', downloadUrl: 'https://x' },
  });
  const webView = screen.getByTestId('webview');
  expect(webView.props.style).toEqual({ backgroundColor: 'white' });
  expect(webView.props.decelerationRate).toBe('normal');
});

it('lists only what is known of a file', async () => {
  mockFile = {
    ...zip,
    fileType: '',
    category: undefined,
    courseTeacherName: '',
    uploadTime: '',
  } as never;
  downloaded({ path: 'file:///a' });
  await renderScreen({ id: zip.id });
  expect(screen.getByText(t('unknownFileType'), { exact: false })).toBeTruthy();
  expect(screen.queryByText(t('fileCategory'))).toBeNull();
  expect(screen.queryByText(t('fileTeacher'))).toBeNull();
  expect(screen.queryByText(t('fileUploadTime'))).toBeNull();
});
