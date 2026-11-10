import { StyleSheet } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { buttonStyle, font, frame } from '@expo/ui/swift-ui/modifiers';
import IconButton from 'components/IconButton';
import TextButton from 'components/TextButton';
import TextField from 'components/TextField';
import DeviceInfo from 'constants/DeviceInfo';

afterEach(() => jest.restoreAllMocks());

/** The names of the SwiftUI modifiers a button was given. */
const modifierNames = (button: { props: { modifiers?: unknown[] } }) =>
  (button.props.modifiers ?? []).map(
    modifier => (modifier as { modifier?: string } | undefined)?.modifier,
  );

describe('TextButton (iOS)', () => {
  it('follows Dynamic Type through text styles, bold or crossed out', async () => {
    await render(
      <>
        <TextButton size="small" bold onPress={jest.fn()}>
          More
        </TextButton>
        <TextButton struck disabled testID="old" onPress={jest.fn()}>
          old.pdf
        </TextButton>
      </>,
    );
    expect(font).toHaveBeenCalledWith({
      textStyle: 'footnote',
      weight: 'semibold',
    });
    expect(font).toHaveBeenCalledWith({
      textStyle: 'subheadline',
      weight: undefined,
    });
    const old = screen.getByTestId('old');
    expect(modifierNames(old)).toContain('strikethrough');
    expect(old).toBeDisabled();
    expect(
      modifierNames(screen.getByText('More').parent!.parent!),
    ).not.toContain('strikethrough');
  });

  it('uses iOS point sizes on a Mac, with a taller click target', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    const onPress = jest.fn();
    await render(
      <TextButton size="large" fill testID="open" onPress={onPress}>
        Open
      </TextButton>,
    );
    expect(font).toHaveBeenCalledWith({ size: 17, weight: undefined });
    // The label view, padded inside the button
    expect(screen.getByText('Open')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('open'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('IconButton (iOS)', () => {
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

describe('TextField', () => {
  it('labels the field, and dims it while disabled', async () => {
    await render(
      <TextField
        label="Username"
        testID="username"
        disabled
        multiline
        value=""
      />,
    );
    expect(
      screen.getByTestId('username-label', { includeHiddenElements: true }),
    ).toHaveTextContent('Username');
    const input = screen.getByLabelText('Username');
    expect(input.props.editable).toBe(false);
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({
      textAlignVertical: 'top',
      borderRadius: 10,
    });
  });

  it('has no label to show, and stays editable', async () => {
    await render(<TextField placeholder="Search" />);
    expect(screen.getByPlaceholderText('Search').props.editable).toBe(true);
    expect(screen.queryByText('Search')).toBeNull();
  });
});
