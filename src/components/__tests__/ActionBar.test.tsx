import { render, screen, userEvent } from '@testing-library/react-native';
import ActionBar from 'components/ActionBar';

/** The names of the SwiftUI modifiers a button was given. */
const modifierNames = (button: { props: { modifiers?: unknown[] } }) =>
  (button.props.modifiers ?? []).map(
    modifier => (modifier as { modifier?: string } | undefined)?.modifier,
  );

// Hidden from screen readers, so looked up with hidden elements included.
const dividerShown = (testID = 'action-bar-divider') => {
  const { style } = screen.getByTestId(testID, {
    includeHiddenElements: true,
  }).props;
  return !style || style.opacity !== 0;
};

describe('ActionBar (iOS)', () => {
  it('stacks a large filled button over the text button', async () => {
    const action = jest.fn();
    const secondary = jest.fn();
    await render(
      <ActionBar
        action={{ label: 'Done', onPress: action, testID: 'done' }}
        secondaryAction={{
          label: 'Not Now',
          onPress: secondary,
          testID: 'not-now',
        }}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map(button => button.props.testID)).toEqual([
      'done',
      'not-now',
    ]);
    expect(modifierNames(screen.getByTestId('done'))).toContain('controlSize');
    const user = userEvent.setup();
    await user.press(screen.getByTestId('done'));
    await user.press(screen.getByTestId('not-now'));
    expect(action).toHaveBeenCalled();
    expect(secondary).toHaveBeenCalled();
  });

  it('draws its separator only while content is under it', async () => {
    const bar = (scrolledUnder?: boolean) => (
      <ActionBar
        action={{ label: 'Done', onPress: jest.fn(), disabled: true }}
        scrolledUnder={scrolledUnder}
      />
    );
    await render(bar());
    expect(dividerShown()).toBe(false);
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    await screen.rerender(bar(true));
    expect(dividerShown()).toBe(true);
  });
});
