import { Platform } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import { useAppStateStore } from 'data/appState';
import { t } from 'helpers/i18n';
import Welcome from 'screens/Welcome';
import { screenProps } from 'test-utils/screenProps';

it('introduces the app, then goes on to the login for good', async () => {
  useAppStateStore.setState({ welcomeSeen: false });
  const navigation = { replace: jest.fn() };
  await render(<Welcome {...screenProps({ navigation })} />);
  expect(screen.getByRole('header', { name: t('welcomeTitle') })).toBeTruthy();
  expect(
    screen.getByLabelText(
      `${t('welcomeDeadlinesTitle')}, ${t('welcomeDeadlinesBody')}`,
    ),
  ).toBeTruthy();

  await userEvent.press(screen.getByTestId('welcome-continue'));
  expect(useAppStateStore.getState().welcomeSeen).toBe(true);
  expect(navigation.replace).toHaveBeenCalledWith('Login');
});

it("leaves out what the Mac doesn't have", async () => {
  const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<Welcome {...screenProps({ navigation: {} })} />);
  expect(
    screen.getByLabelText(
      `${t('welcomeDeadlinesTitle')}, ${t('welcomeDeadlinesBodyMac')}`,
    ),
  ).toBeTruthy();
  isMac.mockRestore();
});

it('offers only the export on Windows and Linux', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  await render(<Welcome {...screenProps({ navigation: {} })} />);
  expect(
    screen.getByLabelText(
      `${t('welcomeDeadlinesTitle')}, ${t('welcomeDeadlinesBodyElectron')}`,
    ),
  ).toBeTruthy();
});
