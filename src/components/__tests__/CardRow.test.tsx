import { PlatformColor, StyleSheet } from 'react-native';
import type * as ReactNative from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { cardAccessibilityLabel, CardPill } from 'components/CardRow';
import { BrandLightTheme, brandColors } from 'theme';

const RN: typeof ReactNative = require('react-native');
const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

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
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    await render(<CardPill tone="primary">A</CardPill>);
    expect(style(screen.getByText('A')).color).toBe(brandColors.dark);
    expect(style(screen.getByTestId('pill-tint')).backgroundColor).toBe(
      brandColors.dark,
    );
  });
});

describe('cardAccessibilityLabel', () => {
  it('reads a row without flags', () => {
    expect(
      cardAccessibilityLabel({ title: 'Notice', overline: 'Calculus' }),
    ).toBe('Notice, Calculus');
  });
});
