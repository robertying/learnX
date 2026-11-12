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

it('shows the content in the page template, with a spinner until it has rendered', async () => {
  await render(<FormWebView content="<p>Hi</p>" />);
  expect(screen.getByTestId('progress')).toBeTruthy();
  const page = screen.getByText('<p>Hi</p>', { exact: false });
  expect(page.props.children).toContain('<html');
  await userEvent.press(screen.getByTestId('ready'));
  expect(screen.queryByTestId('progress')).toBeNull();
});
