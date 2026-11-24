import { render, screen, userEvent } from '@testing-library/react-native';
import ContainedButton from 'components/ContainedButton';
import DeviceInfo from 'constants/DeviceInfo';

type WithModifiers = { props: { modifiers?: unknown[] } };

/** The SwiftUI modifiers a view was given. */
const modifiers = (view: WithModifiers) =>
  (view.props.modifiers ?? []) as { modifier?: string; args?: unknown[] }[];

describe('ContainedButton (iOS)', () => {
  it('labels the button itself, large when asked', async () => {
    const onPress = jest.fn();
    await render(
      <ContainedButton
        label="Continue"
        size="large"
        testID="continue"
        onPress={onPress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(modifiers(button).map(m => m.modifier)).toContain('controlSize');
    expect(modifiers(screen.getByText('Continue'))).toEqual([]);
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it('leaves its label to the system on a Mac', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    await render(<ContainedButton label="Continue" testID="continue" />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('shows the system spinner before its label while loading, and is disabled', async () => {
    const onPress = jest.fn();
    await render(
      <ContainedButton label="Logging in…" loading onPress={onPress} />,
    );
    const button = screen.getByRole('button', { name: 'Logging in…' });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('progress')).toBeTruthy();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows no spinner otherwise', async () => {
    await render(<ContainedButton label="Log In" />);
    expect(screen.getByRole('button', { name: 'Log In' })).toBeEnabled();
    expect(screen.queryByTestId('progress')).toBeNull();
  });
});
