import { Platform } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { getSettings, resetSettings } from 'data/settings';
import { listDownloads } from 'helpers/files/downloads';
import { t } from 'helpers/i18n';
import FileSettings from 'screens/FileSettings';

jest.mock('helpers/files/downloads', () => ({
  listDownloads: jest.fn(),
}));
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
