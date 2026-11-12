import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
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
