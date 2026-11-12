import { render, screen, userEvent } from '@testing-library/react-native';
import IconButton from 'components/IconButton';

describe('IconButton (Android)', () => {
  it('presses through to the Compose button, read by its label', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton
        icon="settings"
        accessibilityLabel="Settings"
        testID="settings"
        onPress={onPress}
      />,
    );
    expect(screen.getByLabelText('Settings')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('settings'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled, and shows a badge', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton
        icon="refresh"
        testID="refresh"
        disabled
        badge
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId('badge')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('refresh'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reads the badge with the label, and grows its touch area with the icon', async () => {
    await render(
      <>
        <IconButton
          icon="settings"
          accessibilityLabel="Notices"
          badge
          size={32}
          mode="contained"
          testID="notices"
          onPress={jest.fn()}
        />
        <IconButton icon="refresh" onPress={jest.fn()} />
      </>,
    );
    expect(screen.getByLabelText('Notices, New')).toBeTruthy();
    const button = screen.getByTestId('notices');
    expect(button.props.variant).toBe('filledTonal');
    // 8 dp around the icon, as around the default 24 dp one
    expect(button.props.style).toEqual({ width: 48, height: 48 });
    expect(screen.getAllByRole('button')[1].props.variant).toBeUndefined();
  });
});
