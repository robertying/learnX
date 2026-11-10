import {
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import ActionBar from 'components/ActionBar';
import FeatureList from 'components/FeatureList';

/** The names of the SwiftUI modifiers a button was given. */
const modifierNames = (button: { props: { modifiers?: unknown[] } }) =>
  (button.props.modifiers ?? []).map(
    modifier => (modifier as { modifier?: string } | undefined)?.modifier,
  );

// Hidden from screen readers, so looked up with hidden elements included.
const dividerShown = () => {
  const { style } = screen.getByTestId('action-bar-divider', {
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

describe('FeatureList', () => {
  const page = () => (
    <FeatureList
      testID="page"
      sheet
      title="What's New"
      features={[{ icon: 'today', title: 'Today', body: 'Your day.' }]}
      action={{ label: 'Continue', onPress: jest.fn() }}
    />
  );
  const scrollView = () => screen.getByTestId('page-scroll');

  it('scrolls only the features, between the title and the buttons', async () => {
    await render(page());
    const scrolling = within(screen.getByTestId('page-scroll'));
    expect(scrolling.getByText('Today')).toBeTruthy();
    expect(scrolling.queryByRole('header')).toBeNull();
    expect(scrolling.queryByTestId('action-bar')).toBeNull();
    expect(screen.getByRole('header', { name: "What's New" })).toBeTruthy();
    expect(screen.getByTestId('action-bar')).toBeTruthy();
  });

  it('shows the separator while features are hidden under the buttons', async () => {
    await render(page());
    expect(dividerShown()).toBe(false);
    await fireEvent(scrollView(), 'layout', {
      nativeEvent: { layout: { height: 400 } },
    });
    await fireEvent(scrollView(), 'contentSizeChange', 320, 600);
    expect(dividerShown()).toBe(true);
    await fireEvent(scrollView(), 'scroll', {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    expect(dividerShown()).toBe(false);
  });

  it("doesn't before it's laid out, or when everything fits", async () => {
    await render(page());
    await fireEvent(scrollView(), 'contentSizeChange', 320, 600);
    expect(dividerShown()).toBe(false);
    await fireEvent(scrollView(), 'layout', {
      nativeEvent: { layout: { height: 700 } },
    });
    expect(dividerShown()).toBe(false);
  });
});
