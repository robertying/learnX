import { render, screen, userEvent } from '@testing-library/react-native';
import { useAppStateStore } from 'data/appState';
import { t } from 'helpers/i18n';
import { displayVersion, whatsNewContext } from 'helpers/whatsNew';
import WhatsNew from 'screens/WhatsNew';
import packageJson from '../../../package.json';
import { screenProps } from 'test-utils/screenProps';

jest.mock('helpers/whatsNew', () => ({
  ...jest.requireActual('helpers/whatsNew'),
  whatsNewContext: jest.fn(),
}));

const goBack = jest.fn();
const navigation = { push: jest.fn(), getParent: () => ({ goBack }) };
const renderScreen = (params: { version: string; preview?: boolean }) =>
  render(<WhatsNew {...screenProps({ navigation, route: { params } })} />);

beforeEach(() => {
  useAppStateStore.setState({ whatsNewSeenVersion: null });
  jest.mocked(whatsNewContext).mockReturnValue({
    version: '19.0.0',
    nativeVersion: '18.0.2',
    platform: 'android',
  });
});

it('shows the highlights this install has, and marks the running version seen', async () => {
  await renderScreen({ version: '19.0.0' });
  expect(
    screen.getByText(t('whatsNewTitle', { version: displayVersion('19.0.0') })),
  ).toBeTruthy();
  // An over-the-air update on an 18.x install: only the JS-only highlight.
  expect(screen.getByText(t('whatsNew19TodayTitle'))).toBeTruthy();
  expect(screen.queryByText(t('whatsNew19WidgetsTitle'))).toBeNull();
  expect(useAppStateStore.getState().whatsNewSeenVersion).toBe(
    packageJson.version,
  );
});

it('previews every highlight of the release', async () => {
  await renderScreen({ version: '19.0.0', preview: true });
  for (const title of [
    'whatsNew19TodayTitle',
    'whatsNew19WidgetsTitle',
    'whatsNew19RemindersTitle',
    'whatsNew19SpotlightTitle',
  ] as const) {
    expect(screen.getByText(t(title))).toBeTruthy();
  }
});

it('shows no highlights for a release without any', async () => {
  await renderScreen({ version: '18.0.0' });
  expect(screen.queryByText(t('whatsNew19TodayTitle'))).toBeNull();
});

it('closes the sheet, or opens the full changelog in it', async () => {
  const user = userEvent.setup();
  await renderScreen({ version: '19.0.0' });
  await user.press(screen.getByTestId('whats-new-changelog'));
  expect(navigation.push).toHaveBeenCalledWith('Changelog');
  await user.press(screen.getByTestId('whats-new-continue'));
  expect(goBack).toHaveBeenCalled();
});
