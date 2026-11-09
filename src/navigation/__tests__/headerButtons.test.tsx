import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { headerButtons } from 'navigation/headerButtons';

const onPress = jest.fn();

describe('headerButtons', () => {
  const options = headerButtons('right', [
    { id: 'share', label: 'Share', icon: 'share', onPress, disabled: true },
    false,
    {
      id: 'refresh',
      label: 'Refresh',
      icon: 'refresh',
      sfSymbol: 'arrow.trianglehead.2.clockwise.rotate.90',
      onPress,
    },
    { id: 'more', label: 'More', icon: 'info', onPress, nativeItem: false },
    { id: 'menu', element: <Text>Menu</Text> },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      onPress,
      badge: true,
    },
  ]);

  it('describes each button as a native item', () => {
    expect(options.unstable_headerRightItems!({} as never)).toEqual([
      {
        type: 'button',
        identifier: 'share',
        label: 'Share',
        icon: { type: 'sfSymbol', name: 'square.and.arrow.up' },
        onPress,
        disabled: true,
        badge: undefined,
      },
      expect.objectContaining({
        identifier: 'refresh',
        icon: {
          type: 'sfSymbol',
          name: 'arrow.trianglehead.2.clockwise.rotate.90',
        },
      }),
      expect.objectContaining({
        identifier: 'settings',
        badge: { value: '' },
      }),
    ]);
  });

  it('draws every button and element in the same order', async () => {
    const HeaderRight = options.headerRight as () => React.ReactElement;
    await render(<HeaderRight />);
    const labels = screen
      .getAllByText(/Share|Refresh|More|Menu|Settings/)
      .map(node => node.props.children);
    expect(labels).toEqual([
      'Share',
      'Refresh',
      'More',
      'Menu',
      expect.stringMatching(/^Settings/),
    ]);
  });
});
