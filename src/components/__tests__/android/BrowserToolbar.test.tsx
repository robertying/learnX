import { render, screen, userEvent } from '@testing-library/react-native';
import BrowserToolbar from 'components/BrowserToolbar';
import { t } from 'helpers/i18n';

const handlers = {
  onBack: jest.fn(),
  onForward: jest.fn(),
  onReload: jest.fn(),
  onOpenInBrowser: jest.fn(),
};

describe('BrowserToolbar', () => {
  it('presses through to the page, as far as it can go', async () => {
    const user = userEvent.setup();
    await render(
      <BrowserToolbar
        canGoBack
        canGoForward={false}
        loading={false}
        {...handlers}
      />,
    );
    expect(screen.getByLabelText(t('back'))).toBeTruthy();
    expect(screen.getByTestId('courseXForward')).toBeDisabled();
    await user.press(screen.getByTestId('courseXBack'));
    await user.press(screen.getByTestId('courseXReload'));
    await user.press(screen.getByTestId('courseXOpen'));
    expect(handlers.onBack).toHaveBeenCalled();
    expect(handlers.onReload).toHaveBeenCalled();
    expect(handlers.onOpenInBrowser).toHaveBeenCalled();
  });

  it("doesn't reload or open a page still loading", async () => {
    await render(
      <BrowserToolbar canGoBack={false} canGoForward loading {...handlers} />,
    );
    expect(screen.getByTestId('courseXBack')).toBeDisabled();
    expect(screen.getByTestId('courseXForward')).toBeEnabled();
    expect(screen.getByTestId('courseXReload')).toBeDisabled();
    expect(screen.getByTestId('courseXOpen')).toBeDisabled();
  });
});
