import { render, screen, userEvent } from '@testing-library/react-native';
import IconButton from 'components/IconButton';

describe('IconButton (iOS)', () => {
  it('presses through to the SwiftUI button', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon="settings" testID="settings" onPress={onPress} />,
    );

    await userEvent.setup().press(screen.getByTestId('settings'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a dot only with a badge', async () => {
    await render(<IconButton icon="settings" />);
    const plain = JSON.stringify(screen.toJSON());

    await screen.rerender(<IconButton icon="settings" badge />);

    expect(JSON.stringify(screen.toJSON()).length).toBeGreaterThan(
      plain.length,
    );
  });
});
