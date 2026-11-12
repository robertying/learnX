import { render, screen, userEvent } from '@testing-library/react-native';
import { buttonStyle, frame } from '@expo/ui/swift-ui/modifiers';
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

  it('draws a contained button at its size, with the badge in its label', async () => {
    await render(
      <IconButton
        icon="settings"
        size={32}
        mode="contained"
        badge
        accessibilityLabel="Settings"
      />,
    );
    expect(buttonStyle).toHaveBeenCalledWith('bordered');
    expect(frame).toHaveBeenCalledWith({ width: 48, height: 48 });
    expect(screen.getByText('Settings, New')).toBeTruthy();
  });

  it('keeps a small borderless button at the 44 pt tap target', async () => {
    await render(<IconButton icon="settings" size={16} badge />);
    expect(buttonStyle).toHaveBeenCalledWith('borderless');
    expect(frame).toHaveBeenCalledWith({ width: 44, height: 44 });
    expect(screen.getByText(', New')).toBeTruthy();
  });
});
