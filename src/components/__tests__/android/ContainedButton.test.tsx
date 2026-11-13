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
