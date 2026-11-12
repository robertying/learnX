import { StyleSheet } from 'react-native';
import type * as ReactNative from 'react-native';
import { render, screen } from '@testing-library/react-native';
import HeaderTitle from 'components/HeaderTitle';

const RN: typeof ReactNative = require('react-native');

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

describe('HeaderTitle (Android)', () => {
  const atWidth = (width: number) =>
    jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });

  it('starts at the leading edge, capped in width on a phone', async () => {
    atWidth(400);
    await render(<HeaderTitle title="Notices" subtitle="Fall 2026" />);
    const bar = screen.getByText('Notices').parent!;
    expect(style(bar)).toMatchObject({
      maxWidth: 250,
      height: 56,
      alignItems: 'flex-start',
    });
    expect(style(screen.getByText('Fall 2026')).textAlign).toBe('left');
    // Android titles follow the font scale, up to a point.
    expect(screen.getByText('Notices').props.allowFontScaling).toBe(true);
  });

  it('gets the roomy bar on a wide window', async () => {
    atWidth(1200);
    await render(<HeaderTitle title="Notices" />);
    expect(style(screen.getByText('Notices').parent!)).toMatchObject({
      maxWidth: undefined,
      height: 64,
    });
  });
});
