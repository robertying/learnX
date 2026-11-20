import { render, screen, userEvent } from '@testing-library/react-native';
import {
  accessibilityAddTraits,
  buttonStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';
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

  it('draws a button that is on filled at its size, with the badge in its label', async () => {
    await render(
      <IconButton
        icon="settings"
        size={32}
        pressed
        badge
        accessibilityLabel="Settings"
      />,
    );
    expect(buttonStyle).toHaveBeenCalledWith('bordered');
    expect(frame).toHaveBeenCalledWith({ width: 48, height: 48 });
    expect(screen.getByText('Settings, New')).toBeTruthy();
  });

  it("says a mode's button is a toggle and whether it's on", async () => {
    await render(
      <>
        <IconButton icon="select" accessibilityLabel="Select" pressed />
        <IconButton
          icon="reorder"
          accessibilityLabel="Reorder"
          pressed={false}
        />
        <IconButton icon="search" accessibilityLabel="Search" />
      </>,
    );
    expect(accessibilityAddTraits).toHaveBeenCalledWith([
      'isToggle',
      'isSelected',
    ]);
    expect(accessibilityAddTraits).toHaveBeenCalledWith(['isToggle']);
    expect(accessibilityAddTraits).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Select' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Reorder' })).not.toBeSelected();
  });

  it('keeps a small borderless button at the 44 pt tap target', async () => {
    await render(<IconButton icon="settings" size={16} badge />);
    expect(buttonStyle).toHaveBeenCalledWith('borderless');
    expect(frame).toHaveBeenCalledWith({ width: 44, height: 44 });
    // Without a label there's nothing for the badge's word to follow.
    expect(screen.queryByText(', New')).toBeNull();
  });
});
