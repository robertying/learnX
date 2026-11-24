import { render, screen, userEvent } from '@testing-library/react-native';
import ContainedButton from 'components/ContainedButton';

it("is the system's filled button, one size", async () => {
  const onPress = jest.fn();
  await render(
    <ContainedButton label="Continue" size="large" onPress={onPress} />,
  );
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button.props.modifiers).toBeUndefined();
  await userEvent.setup().press(button);
  expect(onPress).toHaveBeenCalled();
});

it('shows a small circular indicator before its label while loading', async () => {
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
