// What patches/react-native-screens@4.30.1.patch changes on the JS side of
// the split view.
// Its native changes are tested in ios/learnXTests and ios/learnXUITests.
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Jest would load the package's prebuilt lib/ ("main"), which the patch
// leaves alone, so the source is loaded as Metro does.
const { Split } = jest.requireActual<
  typeof import('react-native-screens/experimental')
>('../../node_modules/react-native-screens/src/experimental');

const host = () =>
  screen.container.queryAll(node => node.type === 'RNSSplitHost')[0];

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

it("takes the 'automatic' display mode with any split behavior", async () => {
  await render(
    <Split.Host
      preferredDisplayMode="automatic"
      preferredSplitBehavior="tile"
      maxCollapsedWidth={700}
    >
      <Split.Column>
        <Text>primary</Text>
      </Split.Column>
      <Split.Column>
        <Text>secondary</Text>
      </Split.Column>
    </Split.Host>,
  );
  expect(console.warn).not.toHaveBeenCalled();
  // The prop the patch adds reaches the native view.
  expect(host().props.maxCollapsedWidth).toBe(700);
});

it('still warns about a display mode the split behavior has no room for', async () => {
  await render(
    <Split.Host
      preferredDisplayMode="oneOverSecondary"
      preferredSplitBehavior="tile"
    >
      <Split.Column>
        <Text>primary</Text>
      </Split.Column>
    </Split.Host>,
  );
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('Invalid display mode "oneOverSecondary"'),
  );
});

it("adds a column's own style to the fill", async () => {
  await render(
    <Split.Column style={{ backgroundColor: 'red' }}>
      <Text>column</Text>
    </Split.Column>,
  );
  const column = screen.container.queryAll(
    node => node.type === 'RNSSplitScreen',
  )[0];
  expect(StyleSheet.flatten(column.props.style)).toEqual({
    ...StyleSheet.absoluteFill,
    backgroundColor: 'red',
  });
});
