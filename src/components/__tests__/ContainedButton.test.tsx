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

  it('sets its label in the iOS body size on a Mac', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    await render(<ContainedButton label="Continue" testID="continue" />);
    expect(modifiers(screen.getByText('Continue'))).toEqual([
      { modifier: 'font', args: [{ size: 17 }] },
    ]);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });
});
