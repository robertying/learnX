import { render, screen, userEvent } from '@testing-library/react-native';
import { font, padding } from '@expo/ui/swift-ui/modifiers';
import TextButton from 'components/TextButton';
import { withGutter } from 'components/TextButton.shared';
import DeviceInfo from 'constants/DeviceInfo';

/** The names of the SwiftUI modifiers a button was given. */
const modifierNames = (button: { props: { modifiers?: unknown[] } }) =>
  (button.props.modifiers ?? []).map(
    modifier => (modifier as { modifier?: string } | undefined)?.modifier,
  );

describe('withGutter', () => {
  it('pulls the touch padding into the margins', () => {
    expect(withGutter(undefined, { vertical: 4 })).toEqual([
      undefined,
      { marginTop: -4, marginBottom: -4 },
    ]);
  });

  it("adds to the caller's margins, the most specific one first", () => {
    const style = { margin: 2, marginTop: 10, marginHorizontal: 6 };
    expect(withGutter(style, { vertical: 14, start: 12 })[1]).toEqual({
      marginTop: -4,
      marginBottom: -12,
      marginStart: -6,
    });
  });

  it('pulls padding on both sides into the horizontal margins', () => {
    const style = { marginHorizontal: 4, marginRight: 2 };
    expect(withGutter(style, { vertical: 12, start: 8, end: 8 })[1]).toEqual({
      marginTop: -12,
      marginBottom: -12,
      marginStart: -4,
      marginEnd: -6,
    });
  });

  it('treats a percentage margin as none', () => {
    expect(
      withGutter({ marginVertical: '10%' }, { vertical: 4 })[1],
    ).toMatchObject({ marginTop: -4, marginBottom: -4 });
  });
});

describe('TextButton (iOS)', () => {
  it('pads its label to a 44 pt tap target', async () => {
    await render(
      <>
        <TextButton size="small">See All</TextButton>
        <TextButton size="large">Done</TextButton>
      </>,
    );
    expect(padding).toHaveBeenCalledWith({ vertical: 13, horizontal: 8 });
    expect(padding).toHaveBeenCalledWith({ vertical: 11, horizontal: 8 });
  });

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
