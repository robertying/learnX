import { Alert, Linking } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { useAppStateStore } from 'data/appState';
import { useCredentialsStore } from 'data/credentials';
import { getSettings, resetSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import CourseInformationSharing from 'screens/CourseInformationSharing';
import { screenProps } from 'test-utils/screenProps';

const signIn = (username: string) =>
  useCredentialsStore.setState({
    credentials: {
      username,
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

const renderScreen = () =>
  render(<CourseInformationSharing {...screenProps()} />);

const toggle = (value: boolean) =>
  fireEvent(
    screen.getByLabelText(t('courseInformationSharing')),
    'valueChange',
    value,
  );

let alert: jest.SpyInstance;
beforeEach(() => {
  resetSettings();
  signIn('2020000000');
  useAppStateStore.setState({ courseSharingSeen: false });
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  useCredentialsStore.setState({ credentials: null });
});

const join = async () => {
  const buttons = alert.mock.calls.at(-1)[2];
  await act(() => buttons[1].onPress());
};

it('marks the page seen', async () => {
  await renderScreen();
  expect(useAppStateStore.getState().courseSharingSeen).toBe(true);
});

it('joins once confirmed; the courses are shared from then on', async () => {
  await renderScreen();
  expect(
    screen.getByText(t('courseInformationSharingOffCaption')),
  ).toBeTruthy();
  await toggle(true);
  expect(getSettings().courseInformationSharing).toBe(false);

  await join();
  expect(getSettings().courseInformationSharing).toBe(true);
  expect(
    await screen.findByText(t('courseInformationSharingOnCaption')),
  ).toBeTruthy();
});

it('leaves right away, without asking', async () => {
  setSetting('courseInformationSharing', true);
  await renderScreen();
  await toggle(false);
  expect(alert).not.toHaveBeenCalled();
  expect(getSettings().courseInformationSharing).toBe(false);
});

it('opens CourseX in the browser', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  await renderScreen();
  await userEvent.press(screen.getByText(t('courseX')));
  expect(openURL).toHaveBeenCalledWith('https://tsinghua.app/courses');
});
