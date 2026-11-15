import { Dimensions, StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { Headline, Paragraph, Title } from 'components/Text';

it('lets a title, headline or paragraph take another text style', async () => {
  await render(
    <>
      <Title>Default title</Title>
      <Title variant="caption">Small title</Title>
      <Headline variant="title">Big headline</Headline>
      <Paragraph variant="footnote">Small paragraph</Paragraph>
    </>,
  );
  const size = (text: string) =>
    StyleSheet.flatten(screen.getByText(text).props.style).fontSize;
  expect(size('Small title')).toBeLessThan(size('Default title')!);
  expect(size('Big headline')).toBe(size('Default title'));
  expect(size('Small paragraph')).toBeLessThan(size('Big headline')!);
});

describe('when the text size changes while the app runs', () => {
  const window = Dimensions.get('window');
  const setWindow = (change: Partial<typeof window>) =>
    act(() => {
      Dimensions.set({ window: { ...window, ...change } });
    });

  afterEach(async () => {
    await setWindow({});
  });

  it('lays the text out again at the new size', async () => {
    await render(<Title>Calculus</Title>);
    const before = screen.getByText('Calculus');

    // A window resize alone keeps the text as it is.
    await setWindow({ width: window.width + 100 });
    expect(screen.getByText('Calculus')).toBe(before);

    // A new text size makes a new text view, which React Native lays out at
    // that size (it keeps the old size for a view whose props are the same).
    await setWindow({ fontScale: window.fontScale + 1 });
    expect(screen.getByText('Calculus')).not.toBe(before);
  });
});
