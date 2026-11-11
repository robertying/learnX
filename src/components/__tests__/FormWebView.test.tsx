import { render, screen, userEvent } from '@testing-library/react-native';
import FormWebView from 'components/FormWebView';

// The web view, as its HTML and a button that says it's ready.
jest.mock('components/AutoHeightWebView', () => {
  const { Pressable: Button, Text: Label } = require('react-native');
  return ({
    source,
    onReady,
  }: {
    source: { html: string };
    onReady: () => void;
  }) => (
    <Button testID="ready" onPress={onReady}>
      <Label>{source.html}</Label>
    </Button>
  );
});

it('shows a spinner until the content has rendered', async () => {
  await render(<FormWebView html="<p>Hi</p>" />);
  expect(screen.getByTestId('progress')).toBeTruthy();
  expect(screen.getByText('<p>Hi</p>')).toBeTruthy();
  await userEvent.press(screen.getByTestId('ready'));
  expect(screen.queryByTestId('progress')).toBeNull();
  expect(screen.getByText('<p>Hi</p>')).toBeTruthy();
});
