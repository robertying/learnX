import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Splash from 'components/Splash';

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

describe('Splash (Android)', () => {
  it("draws the splash screen icon's X where the system's splash drew it, on the surface color", async () => {
    await render(<Splash />);
    const splash = screen.toJSON() as {
      props: { style?: unknown };
      children: { type: string; props: Record<string, any> }[];
    };
    // The X's own box, centered as the system's 288 dp icon centers it.
    const [logo] = splash.children as unknown as {
      type: string;
      props: Record<string, any>;
      children: { type: string; props: Record<string, any> }[];
    }[];
    expect(style(logo)).toMatchObject({ width: 101, height: 120 });
    const [icon] = logo.children;
    expect(icon.type).toBe('Image');
    expect(style(icon)).toMatchObject({
      left: -93,
      top: -84,
      width: 288,
      height: 288,
    });
    expect(icon.props.source).toEqual({ uri: 'splash_screen_icon' });
    expect(style(splash).backgroundColor).toMatch(/^rgb/);
  });
});
