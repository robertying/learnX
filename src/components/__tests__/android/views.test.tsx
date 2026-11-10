import { render, screen, userEvent } from '@testing-library/react-native';
import BrowserToolbar from 'components/BrowserToolbar';
import Divider from 'components/Divider';
import FeatureList from 'components/FeatureList';
import ProgressBar from 'components/ProgressBar';
import Spinner from 'components/Spinner';
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

it('draws Material dividers both ways', async () => {
  await render(
    <>
      <Divider />
      <Divider vertical />
    </>,
  );
  expect(screen.getAllByTestId('divider')).toHaveLength(2);
});

it('shows the progress in a linear indicator', async () => {
  await render(<ProgressBar progress={0.42} />);
  expect(screen.getByTestId('progress')).toHaveAccessibilityValue({ now: 42 });
});

it('labels a spinner with the percentage done, when known', async () => {
  await render(<Spinner progress={0.5} />);
  expect(screen.getByTestId('progress')).toBeTruthy();
  expect(screen.getByText('50%')).toBeTruthy();
  await render(<Spinner />);
  expect(screen.queryByText('50%')).toBeNull();
});

it('puts the secondary action before the main one in a Material feature page', async () => {
  const action = { label: 'Continue', onPress: jest.fn(), testID: 'go' };
  const secondaryAction = { label: 'More', onPress: jest.fn(), testID: 'more' };
  await render(
    <FeatureList
      title="Title"
      features={[{ icon: 'afternoon', title: 'Today', body: 'Body' }]}
      action={action}
      secondaryAction={secondaryAction}
    />,
  );
  expect(screen.getByLabelText('Today, Body')).toBeTruthy();
  await userEvent.press(screen.getByTestId('more'));
  expect(secondaryAction.onPress).toHaveBeenCalled();
  await userEvent.press(screen.getByTestId('go'));
  expect(action.onPress).toHaveBeenCalled();
});
