import { PlatformColor, StyleSheet } from 'react-native';
import type * as ReactNative from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { cardAccessibilityLabel, CardPill } from 'components/CardRow';
import Splash from 'components/Splash';
import { Headline, Paragraph, Title } from 'components/Text';
import { BrandLightTheme, brandColors } from 'theme';

const RN: typeof ReactNative = require('react-native');
const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);
const scheme = (value: 'light' | 'dark') =>
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(value);

afterEach(() => jest.restoreAllMocks());

describe('Splash (iOS)', () => {
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
});

describe('CardPill', () => {
  it('writes in the text shade of the system color, over a light tint of it', async () => {
    await render(<CardPill tone="orange">Due soon</CardPill>);
    expect(style(screen.getByText('Due soon')).color).toEqual(
      BrandLightTheme.colors.onStatusContainer.orange,
    );
    expect(style(screen.getByTestId('pill-tint'))).toMatchObject({
      backgroundColor: PlatformColor('systemOrange'),
      opacity: 0.15,
    });
  });

  it('tints a grade with the brand color', async () => {
    scheme('dark');
    await render(<CardPill tone="primary">A</CardPill>);
    expect(style(screen.getByText('A')).color).toBe(brandColors.dark);
    expect(style(screen.getByTestId('pill-tint')).backgroundColor).toBe(
      brandColors.dark,
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
