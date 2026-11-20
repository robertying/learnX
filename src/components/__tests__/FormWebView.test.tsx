import { act, render, screen, userEvent } from '@testing-library/react-native';
import FormWebView from 'components/FormWebView';
import { initialAuth, noteSession, useAuthStore } from 'data/auth';
import { useCredentialsStore } from 'data/credentials';

jest.mock('services/webViewCookies', () => ({
  syncWebViewCookies: jest.fn(async () => ''),
}));

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

describe('with an image from Web Learning', () => {
  const content = '<img src="/b/wlxt/image?id=1">';

  beforeEach(() => {
    useCredentialsStore.setState({
      credentials: {
        username: 'student',
        password: 'p',
        fingerPrint: 'fp',
        fingerGenPrint: '',
        fingerGenPrint3: '',
      },
    });
  });
  afterEach(async () => {
    // Before the stores change under it.
    await screen.unmount();
    useCredentialsStore.setState({ credentials: null });
    useAuthStore.setState(initialAuth);
  });

  it('waits for the login under way, then loads with its token', async () => {
    useAuthStore.setState({ loggingIn: true });
    await render(<FormWebView content={content} />);
    expect(screen.getByTestId('progress')).toBeTruthy();
    expect(screen.queryByTestId('ready')).toBeNull();

    await act(async () => {
      noteSession('fresh-token');
      useAuthStore.setState({ loggingIn: false, loggedIn: true });
    });
    await act(async () => {});
    const page = screen.getByText('fresh-token', { exact: false });
    expect(page.props.children).toContain('<img');
  });

  it('loads again with the new token after a later login', async () => {
    useAuthStore.setState({ loggedIn: true, sessionToken: 'old-token' });
    await render(<FormWebView content={content} />);
    await act(async () => {});
    expect(screen.getByText('old-token', { exact: false })).toBeTruthy();
    await userEvent.press(screen.getByTestId('ready'));

    await act(async () => noteSession('new-token'));
    await act(async () => {});
    expect(screen.getByText('new-token', { exact: false })).toBeTruthy();
    // The content that had rendered stays up while it loads again.
    expect(screen.queryByTestId('progress')).toBeNull();
  });
});
