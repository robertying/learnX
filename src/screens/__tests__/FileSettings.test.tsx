import { Linking, Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { getSettings, resetSettings } from 'data/settings';
import {
  ensureDownloadsDirectory,
  listDownloads,
  moveDownloadsToCurrentDirectory,
} from 'helpers/files/downloads';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import FileSettings from 'screens/FileSettings';

jest.mock('helpers/files/downloads', () => ({
  ensureDownloadsDirectory: jest.fn(() => 'file:///downloads'),
  listDownloads: jest.fn(),
  moveDownloadsToCurrentDirectory: jest.fn(),
}));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) =>
    require('react').useEffect(effect, [effect]),
}));

const navigation = { push: jest.fn() };
const renderScreen = () =>
  render(<FileSettings navigation={navigation as never} route={{} as never} />);

const os = Platform.OS;
beforeEach(() => {
  resetSettings();
  jest.mocked(listDownloads).mockReturnValue([
    { courseName: 'a', count: 1, size: 1000 },
    { courseName: 'b', count: 1, size: 1000 },
  ] as never);
});
afterEach(() => {
  Platform.OS = os;
  jest.restoreAllMocks();
});

it('moves the downloads when switching directories, and explains each choice', async () => {
  await renderScreen();
  expect(screen.getByText(t('fileUseDocumentDirOffCaption'))).toBeTruthy();
  await fireEvent(
    screen.getByLabelText(t('fileUseDocumentDir')),
    'valueChange',
    true,
  );
  expect(getSettings().fileUseDocumentDir).toBe(true);
  expect(moveDownloadsToCurrentDirectory).toHaveBeenCalled();
  expect(
    await screen.findByText(t('fileUseDocumentDirOnCaption')),
  ).toBeTruthy();

  expect(screen.getByText(t('fileOmitCourseNameOffCaption'))).toBeTruthy();
  await fireEvent(
    screen.getByLabelText(t('fileOmitCourseName')),
    'valueChange',
    true,
  );
  expect(getSettings().fileOmitCourseName).toBe(true);
  expect(
    await screen.findByText(t('fileOmitCourseNameOnCaption')),
  ).toBeTruthy();
});

it('offers opening files after download on Android only', async () => {
  Platform.OS = 'ios';
  await renderScreen();
  expect(screen.queryByLabelText(t('openFileAfterDownload'))).toBeNull();

  Platform.OS = 'android';
  await renderScreen();
  const value = getSettings().openFileAfterDownload;
  await fireEvent(
    screen.getByLabelText(t('openFileAfterDownload')),
    'valueChange',
    !value,
  );
  expect(getSettings().openFileAfterDownload).toBe(!value);
});

it('links to the downloads with their total size', async () => {
  await renderScreen();
  expect(screen.getByText('2.0 KB')).toBeTruthy();
  await userEvent.press(screen.getByText(t('downloads')));
  expect(navigation.push).toHaveBeenCalledWith('Downloads');
});

it('opens the download folder on Mac, and says why when it fails', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(false);
  await renderScreen();
  expect(screen.queryByText(t('openFileDownloadDirectory'))).toBeNull();

  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  await renderScreen();
  await userEvent.press(screen.getByText(t('openFileDownloadDirectory')));
  expect(ensureDownloadsDirectory).toHaveBeenCalled();
  expect(openURL).toHaveBeenCalledWith('file:///downloads');

  openURL.mockRejectedValueOnce(new Error('denied'));
  await userEvent.press(screen.getByText(t('openFileDownloadDirectory')));
  expect(toast).toHaveBeenCalledWith(
    t('openFileDownloadDirectoryFailed') + 'denied',
    'error',
  );
});
