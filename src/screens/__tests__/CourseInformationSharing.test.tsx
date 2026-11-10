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
import { dataSource } from 'data/source';
import { resetUserData, setCurrentSemester } from 'data/userData';
import { uploadCourses } from 'helpers/coursex';
import { t } from 'helpers/i18n';
import CourseInformationSharing from 'screens/CourseInformationSharing';

jest.mock('data/source', () => ({
  dataSource: { getCourseList: jest.fn() },
}));
jest.mock('helpers/coursex', () => ({ uploadCourses: jest.fn() }));

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
  render(
    <CourseInformationSharing navigation={{} as never} route={{} as never} />,
  );

const toggle = (value: boolean) =>
  fireEvent(
    screen.getByLabelText(t('courseInformationSharing')),
    'valueChange',
    value,
  );

let alert: jest.SpyInstance;
beforeEach(() => {
  resetSettings();
  resetUserData();
  setCurrentSemester('2026-2027-1');
  signIn('2020000000');
  useAppStateStore.setState({ courseSharingSeen: false });
  jest
    .mocked(dataSource.getCourseList)
    .mockResolvedValue([{ id: 'c1', name: '微积分' }] as never);
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

it("joins once confirmed, sharing this semester's courses", async () => {
  await renderScreen();
  expect(
    screen.getByText(t('courseInformationSharingOffCaption')),
  ).toBeTruthy();
  await toggle(true);
  expect(getSettings().courseInformationSharing).toBe(false);

  await join();
  expect(getSettings().courseInformationSharing).toBe(true);
  expect(dataSource.getCourseList).toHaveBeenCalledWith('2026-2027-1', {
    lang: 'zh',
  });
  expect(uploadCourses).toHaveBeenCalledWith([
    { id: 'c1', name: '微积分', semesterId: '2026-2027-1' },
  ]);
  expect(
    await screen.findByText(t('courseInformationSharingOnCaption')),
  ).toBeTruthy();
});

it('joins without uploading anything for the mock account', async () => {
  signIn('mock-user');
  await renderScreen();
  await toggle(true);
  await join();
  expect(getSettings().courseInformationSharing).toBe(true);
  expect(uploadCourses).not.toHaveBeenCalled();
});

it('uploads nothing before a semester, and keeps joined if the upload fails', async () => {
  resetUserData();
  await renderScreen();
  await toggle(true);
  await join();
  expect(dataSource.getCourseList).not.toHaveBeenCalled();
  expect(uploadCourses).toHaveBeenCalledWith([]);

  jest.mocked(uploadCourses).mockRejectedValueOnce(new Error('offline'));
  await toggle(true);
  await join();
  expect(getSettings().courseInformationSharing).toBe(true);
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
