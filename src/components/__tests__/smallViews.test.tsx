import { StyleSheet } from 'react-native';
import type * as ReactNative from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { cardAccessibilityLabel, CardPill } from 'components/CardRow';
import Splash from 'components/Splash';
import { Headline, Paragraph, Title } from 'components/Text';
import { BrandDarkTheme, BrandLightTheme } from 'theme';

const RN: typeof ReactNative = require('react-native');
const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);
const scheme = (value: 'light' | 'dark') =>
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(value);

afterEach(() => jest.restoreAllMocks());

describe('Splash (iOS)', () => {
  it.each([
    ['light', 'white'],
    ['dark', 'black'],
  ] as const)(
    'matches the launch screen in %s mode',
    async (mode, background) => {
      scheme(mode);
      await render(<Splash />);
      const splash = screen.toJSON() as {
        props: { style?: unknown };
        children: { props: Record<string, any> }[];
      };
      expect(style(splash).backgroundColor).toBe(background);
      expect(splash.children[0].props.source).toEqual({ uri: 'MaskedAppIcon' });
      expect(style(splash.children[0])).toMatchObject({
        width: 160,
        height: 160,
      });
    },
  );
});

describe('CardPill', () => {
  it('uses the color itself on dark backgrounds, darker on light ones', async () => {
    const color = BrandLightTheme.colors.status.orange;
    scheme('light');
    await render(<CardPill color={color}>Due soon</CardPill>);
    const light = style(screen.getByText('Due soon')).color;
    expect(light).not.toBe(color);

    scheme('dark');
    await render(
      <CardPill color={BrandDarkTheme.colors.status.orange}>Due soon</CardPill>,
    );
    expect(style(screen.getByText('Due soon')).color).toBe(
      BrandDarkTheme.colors.status.orange,
    );
  });

  it('reads a row without flags', () => {
    expect(
      cardAccessibilityLabel({ title: 'Notice', overline: 'Calculus' }),
    ).toBe('Notice, Calculus');
  });
});

describe('Text', () => {
  it('lets a title, headline or paragraph take another text style', async () => {
    await render(
      <>
        <Title>Default title</Title>
        <Title variant="caption">Small title</Title>
        <Headline variant="title">Big headline</Headline>
        <Paragraph variant="footnote">Small paragraph</Paragraph>
      </>,
    );
    const size = (text: string) => style(screen.getByText(text)).fontSize;
    expect(size('Small title')).toBeLessThan(size('Default title')!);
    expect(size('Big headline')).toBe(size('Default title'));
    expect(size('Small paragraph')).toBeLessThan(size('Big headline')!);
  });
});
