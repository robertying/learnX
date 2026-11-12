import { PlatformColor, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Splash from 'components/Splash';

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

it('matches the launch screen, on the system background', async () => {
  await render(<Splash />);
  const splash = screen.toJSON() as {
    props: { style?: unknown };
    children: { props: Record<string, any> }[];
  };
  expect(style(splash).backgroundColor).toEqual(
    PlatformColor('systemBackground'),
  );
  expect(splash.children[0].props.source).toEqual({ uri: 'MaskedAppIcon' });
  expect(style(splash.children[0])).toMatchObject({
    width: 160,
    height: 160,
  });
});
