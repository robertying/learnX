import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Splash from 'components/Splash';

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

afterEach(() => jest.restoreAllMocks());

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
