import { Alert, AlertButton } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { t } from 'helpers/i18n';
import useAppLanguage from 'hooks/useAppLanguage';
import LanguageSettings from 'screens/LanguageSettings';

jest.mock('hooks/useAppLanguage', () => jest.fn(() => null));

const setting = (language: 'system' | 'zh-CN' | 'en-US', saved = true) => {
  const value = {
    language,
    set: jest.fn(async () => saved),
    relaunch: jest.fn(),
  };
  jest.mocked(useAppLanguage).mockReturnValue(value);
  return value;
};

it('shows nothing where learnX has no language of its own', async () => {
  await render(<LanguageSettings />);
  expect(screen.queryByTestId('language-system')).toBeNull();
});

it('checks the language chosen, each named in its own language', async () => {
  setting('zh-CN');
  await render(<LanguageSettings />);
  expect(screen.getByText(t('followSystem'))).toBeTruthy();
  expect(screen.getByText('简体中文')).toBeTruthy();
  expect(screen.getByText('English')).toBeTruthy();
  expect(
    screen.getByTestId('language-zh-CN').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('language-system').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

it('saves another language and asks to restart now or later', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const value = setting('system');
  await render(<LanguageSettings />);
  await userEvent.press(screen.getByTestId('language-system'));
  expect(value.set).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();

  await userEvent.press(screen.getByTestId('language-zh-CN'));
  expect(value.set).toHaveBeenCalledWith('zh-CN');
  const [title, message, buttons] = alert.mock.calls[0];
  expect([title, message]).toEqual([
    t('languageRestartTitle'),
    t('languageRestartMessage'),
  ]);
  const [later, restart] = buttons as AlertButton[];
  expect(later).toMatchObject({ text: t('later'), style: 'cancel' });
  expect(restart.text).toBe(t('restartNow'));
  restart.onPress?.();
  expect(value.relaunch).toHaveBeenCalled();
});

it('asks nothing when the choice couldn’t be saved', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const value = setting('system', false);
  await render(<LanguageSettings />);
  await userEvent.press(screen.getByTestId('language-en-US'));
  expect(value.set).toHaveBeenCalledWith('en-US');
  expect(alert).not.toHaveBeenCalled();
});
