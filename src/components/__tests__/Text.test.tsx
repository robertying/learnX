import { Dimensions, StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { Headline, Paragraph, Title, useTextIconSize } from 'components/Text';

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

it("takes macOS's text sizes on a Mac", () => {
  jest.isolateModules(() => {
    const DeviceInfo = require('constants/DeviceInfo').default;
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    const { textStyles } = require('components/Text');
    expect(textStyles.body.fontSize).toBe(13);
    expect(textStyles.subheadline.fontSize).toBe(11);
    expect(textStyles.headline.fontWeight).toBe('700');
  });
});

it('sizes an icon beside text as the text, growing with the text size', async () => {
  const Probe = () => <Title>{String(useTextIconSize('subheadline'))}</Title>;
  const window = Dimensions.get('window');
  Dimensions.set({ window: { ...window, fontScale: 1 } });
  await render(<Probe />);
  expect(screen.getByText('15')).toBeTruthy();
  await act(() => {
    Dimensions.set({ window: { ...window, fontScale: 3 } });
  });
  // Up to twice the text's default size
  expect(screen.getByText('30')).toBeTruthy();
  await act(() => {
    Dimensions.set({ window });
  });
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
