import { Alert, Platform } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { getSettings, resetSettings } from 'data/settings';
import {
  listDownloads,
  removeCourseDownloads,
  removeFileDir,
} from 'services/files/downloads';
import { exportDownloads } from 'services/files/export';
import { t } from 'helpers/i18n';
import { toast } from 'components/Toast';
import Downloads from 'screens/Downloads';
import { screenProps } from 'test-utils/screenProps';

jest.mock('services/files/downloads', () => ({
  listDownloads: jest.fn(),
  removeCourseDownloads: jest.fn(),
  removeFileDir: jest.fn(),
}));
jest.mock('services/files/export', () => ({ exportDownloads: jest.fn() }));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) =>
    require('react').useEffect(effect, [effect]),
}));

const courses = [
  { courseId: 'c1', courseName: '微积分', count: 1, size: 1000 },
  { courseId: 'c2', courseName: '物理', count: 3, size: 2000 },
];

const renderScreen = () => render(<Downloads {...screenProps()} />);

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.mocked(listDownloads).mockReturnValue(courses as never);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

/** Presses the last alert's button `text`. */
const pressAlertButton = async (text: string) => {
  const buttons: { text: string; onPress?: () => unknown }[] =
    alert.mock.calls.at(-1)[2];
  await act(async () => {
    await buttons.find(button => button.text === text)?.onPress?.();
  });
};
const confirmDelete = () => pressAlertButton(t('delete'));
/** Picks `label` in the open course sheet. */
const pressChoice = async (label: string) => {
  const sheet = screen.getByTestId('confirmation-dialog');
  await userEvent.press(within(sheet).getByText(label));
};

it('sums the downloads and lists each course with its count and size', async () => {
  await renderScreen();
  expect(
    screen.getByText(`${t('downloadsFileCount', { count: 4 })} · 3.0 KB`),
  ).toBeTruthy();
  expect(screen.getByText('微积分')).toBeTruthy();
  expect(screen.getByText(`${t('downloadsOneFile')} · 1.0 KB`)).toBeTruthy();
  expect(
    screen.getByText(`${t('downloadsFileCount', { count: 3 })} · 2.0 KB`),
  ).toBeTruthy();
});

it('shows only the total without downloads', async () => {
  jest.mocked(listDownloads).mockReturnValue([]);
  await renderScreen();
  expect(
    screen.getByText(`${t('downloadsFileCount', { count: 0 })} · 0 B`),
  ).toBeTruthy();
  expect(screen.queryByText('微积分')).toBeNull();
});

it("deletes a course's files once confirmed, then lists again", async () => {
  await renderScreen();
  await userEvent.press(screen.getByText('物理'));
  const sheet = screen.getByTestId('confirmation-dialog');
  expect(within(sheet).getByText('物理')).toBeTruthy();
  expect(
    within(sheet).getByText(
      `${t('downloadsFileCount', { count: 3 })} · 2.0 KB`,
    ),
  ).toBeTruthy();
  await pressChoice(t('deleteEllipsis'));
  expect(alert.mock.calls[0][0]).toBe(t('downloadsDeleteCourse'));
  expect(alert.mock.calls[0][1]).toContain('物理');
  expect(removeCourseDownloads).not.toHaveBeenCalled();

  jest.mocked(listDownloads).mockReturnValue([courses[0]] as never);
  await confirmDelete();
  expect(removeCourseDownloads).toHaveBeenCalledWith('c2');
  expect(toast).toHaveBeenCalledWith(
    t('downloadsDeletedCourse', { course: '物理' }),
    'success',
  );
  expect(screen.queryByText('物理')).toBeNull();
});

it('clears the file cache, and says why when it fails', async () => {
  await renderScreen();
  await userEvent.press(screen.getByText(t('clearFileCacheEllipsis')));
  await confirmDelete();
  expect(removeFileDir).toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(t('clearFileCacheSucceeded'), 'success');

  jest.mocked(removeFileDir).mockRejectedValueOnce(new Error('busy'));
  await userEvent.press(screen.getByText(t('clearFileCacheEllipsis')));
  await confirmDelete();
  expect(toast).toHaveBeenLastCalledWith(
    t('deleteFailed', { error: 'busy' }),
    'error',
  );
});

it('exports all downloads or one course, and says how it went', async () => {
  await renderScreen();
  jest
    .mocked(exportDownloads)
    .mockResolvedValueOnce({ exported: 4, failed: 0 });
  await userEvent.press(screen.getByText(t('downloadsExport')));
  expect(exportDownloads).toHaveBeenCalledWith(undefined);
  expect(toast).toHaveBeenLastCalledWith(
    t('downloadsExported', {
      files: t('downloadsFileCount', { count: 4 }),
    }),
    'success',
  );

  jest
    .mocked(exportDownloads)
    .mockResolvedValueOnce({ exported: 1, failed: 2 });
  await userEvent.press(screen.getByText('微积分'));
  await pressChoice(t('downloadsExportCourse'));
  expect(exportDownloads).toHaveBeenLastCalledWith('c1');
  expect(toast).toHaveBeenLastCalledWith(
    t('downloadsExportedPartly', { files: t('downloadsOneFile'), failed: 2 }),
    'error',
  );
});

it('says nothing when the folder picker is cancelled, and why export failed', async () => {
  await renderScreen();
  jest.mocked(exportDownloads).mockResolvedValueOnce(null);
  await userEvent.press(screen.getByText(t('downloadsExport')));
  expect(toast).not.toHaveBeenCalled();

  jest.mocked(exportDownloads).mockRejectedValueOnce(new Error('denied'));
  await userEvent.press(screen.getByText(t('downloadsExport')));
  expect(toast).toHaveBeenCalledWith(
    t('downloadsExportFailed', { error: 'denied' }),
    'error',
  );
});

describe('open files after downloading', () => {
  beforeEach(() => resetSettings());

  it('is offered on Android only', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderScreen();
    expect(screen.queryByLabelText(t('openFileAfterDownload'))).toBeNull();

    jest.replaceProperty(Platform, 'OS', 'android');
    await renderScreen();
    const value = getSettings().openFileAfterDownload;
    await fireEvent(
      screen.getByLabelText(t('openFileAfterDownload')),
      'valueChange',
      !value,
    );
    expect(getSettings().openFileAfterDownload).toBe(!value);
  });
});
