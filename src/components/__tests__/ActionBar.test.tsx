import { StyleSheet } from 'react-native';
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
    expect(dividerShown('page-title-divider')).toBe(false);
    await fireEvent(scrollView(), 'scroll', {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    expect(dividerShown()).toBe(false);
    expect(dividerShown('page-title-divider')).toBe(true);
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

it('grows the symbols with the text size, up to a limit', async () => {
  const dimensions = jest.requireActual('react-native').Dimensions;
  const get = dimensions.get;
  const symbolSizes = async (fontScale: number) => {
    jest
      .spyOn(dimensions, 'get')
      .mockImplementation(dim => ({ ...get(dim), fontScale }));
    await render(
      <FeatureList
        title="Welcome"
        features={[{ icon: 'today', title: 'Today', body: 'Your day.' }]}
        action={{ label: 'Continue', onPress: jest.fn() }}
      />,
    );
    return StyleSheet.flatten(
      screen.getByTestId('feature-icon', { includeHiddenElements: true }).props
        .style,
    ).width;
  };
  expect(await symbolSizes(1)).toBe(40);
  expect(await symbolSizes(1.2)).toBeCloseTo(48);
  expect(await symbolSizes(3)).toBeCloseTo(64);
  jest.restoreAllMocks();
});
