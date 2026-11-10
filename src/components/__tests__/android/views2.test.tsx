import { StyleSheet } from 'react-native';
import type * as ReactNative from 'react-native';
import { render, screen } from '@testing-library/react-native';
import CardRow, { CardGutter } from 'components/CardRow';
import HeaderTitle from 'components/HeaderTitle';
import Splash from 'components/Splash';

const RN: typeof ReactNative = require('react-native');
const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

afterEach(() => jest.restoreAllMocks());

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

describe('Splash (Android)', () => {
  it('draws the larger logo on the surface color', async () => {
    await render(<Splash />);
    const splash = screen.toJSON() as {
      props: { style?: unknown };
      children: { type: string; props: Record<string, any> }[];
    };
    const [logo] = splash.children;
    expect(logo.type).toBe('Image');
    expect(style(logo)).toMatchObject({ width: 288, height: 288 });
    expect(logo.props.source).toEqual({ uri: 'splash_screen_icon' });
    expect(style(splash).backgroundColor).toMatch(/^rgb/);
  });
});

describe('CardRow (Android)', () => {
  it('sets only unread titles bolder, with no unread gutter', async () => {
    await render(
      <>
        <CardGutter unread />
        <CardRow title="Read" unread={false} trailing="10:00" />
        <CardRow title="Never unread" />
        <CardRow title="Unread" unread />
      </>,
    );
    expect(screen.queryByTestId('unread-dot')).toBeNull();
    expect(style(screen.getByText('Read')).fontWeight).toBe('400');
    expect(style(screen.getByText('Never unread')).fontWeight).toBe('400');
    expect(style(screen.getByText('Unread')).fontWeight).not.toBe('400');
    expect(screen.getByText('10:00')).toBeTruthy();
  });
});
