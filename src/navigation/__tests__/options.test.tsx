import { Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { render, screen, userEvent } from '@testing-library/react-native';
import Colors from 'constants/Colors';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import {
  getCloseHeaderItem,
  getDetailScreenOptions,
  getModalScreenOptions,
} from 'navigation/options';
import { screenLayout } from 'navigation/screenLayout';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

const navigation = { goBack: jest.fn() };
const theme = { colors: { text: '#123456' } } as never;

it('closes a modal stack from its native close item or its button', async () => {
  const item = getCloseHeaderItem(navigation);
  expect(item).toMatchObject({
    type: 'button',
    label: t('close'),
    icon: { type: 'sfSymbol', name: 'xmark' },
  });
  (item as { onPress: () => void }).onPress();
  expect(navigation.goBack).toHaveBeenCalledTimes(1);

  const options = getModalScreenOptions('Title')({ navigation });
  expect(options.title).toBe('Title');
  expect(options.unstable_headerLeftItems!({} as never)).toEqual([
    expect.objectContaining({ identifier: 'close' }),
  ]);
  await render(
    <NavigationContext.Provider value={navigation as never}>
      {options.headerLeft!({} as never)}
    </NavigationContext.Provider>,
  );
  await userEvent.press(screen.getByText(t('close')));
  expect(navigation.goBack).toHaveBeenCalledTimes(2);
});

it('tints detail headers on iOS, keeping a native title in the text color', () => {
  const options = getDetailScreenOptions('Detail')({ theme });
  expect(options.title).toBe('Detail');
  expect(options.headerTintColor).toBe(
    Platform.OS === 'ios' ? Colors.theme : undefined,
  );
  expect(options.headerTitleStyle).toEqual(
    DeviceInfo.supportsNativeSubtitle() ? { color: '#123456' } : undefined,
  );
  expect(getDetailScreenOptions()({ theme }).title).toBe('');
});

it('shows a failed screen as an error in its place', async () => {
  const Broken = () => {
    throw new Error('broken');
  };
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(screenLayout({ children: <Broken /> }));
  expect(screen.getByTestId('error-fallback')).toBeTruthy();
});
