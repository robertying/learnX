import { render, screen, userEvent } from '@testing-library/react-native';
import { defaultSettings, getSettings, setSetting } from 'data/settings';
import { t } from 'helpers/i18n';
import SwipeActions from 'screens/SwipeActions';
import { screenProps } from 'test-utils/screenProps';

const renderScreen = () => render(<SwipeActions {...screenProps()} />);

afterEach(() => setSetting('swipeActions', defaultSettings.swipeActions));

it('checks the choice for each direction: Archive right and Favorite left at first', async () => {
  await renderScreen();
  expect(screen.getByText(t('swipeRight'))).toBeTruthy();
  expect(screen.getByText(t('swipeLeft'))).toBeTruthy();
  expect(screen.getByText(t('swipeActionsFooter'))).toBeTruthy();
  expect(screen.getAllByTestId('icon-checkmark')).toHaveLength(2);
});

it('saves the choice for its own direction only', async () => {
  const user = userEvent.setup();
  await renderScreen();
  await user.press(screen.getByTestId('swipe-right-fav'));
  expect(getSettings().swipeActions).toEqual({ right: 'fav', left: 'fav' });
  await user.press(screen.getByTestId('swipe-left-none'));
  expect(getSettings().swipeActions).toEqual({ right: 'fav', left: 'none' });
});
