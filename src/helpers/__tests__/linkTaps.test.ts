// The link tap reporter (helpers/preval/linkTaps.js) that the notice and
// assignment web views run on Android.

const { reportLinkTaps } = require('helpers/preval/linkTaps.js');

const tap = (href: string | null) => {
  let onClick!: (event: object) => void;
  const root = {
    addEventListener: (type: string, listener: typeof onClick) => {
      expect(type).toBe('click');
      onClick = listener;
    },
  };
  const post = jest.fn();
  reportLinkTaps(root, post, 'key');
  const link =
    href === null
      ? null
      : { href: `resolved ${href}`, getAttribute: () => href };
  const event = {
    target: { closest: () => link },
    preventDefault: jest.fn(),
  };
  onClick(event);
  return { post, prevented: event.preventDefault.mock.calls.length > 0 };
};

it('posts a tapped link with the key instead of following it', () => {
  const { post, prevented } = tap('/b/file');
  expect(prevented).toBe(true);
  expect(JSON.parse(post.mock.calls[0][0])).toEqual({
    type: 'link',
    key: 'key',
    url: 'resolved /b/file',
  });
});

it('leaves links within the page and taps off links alone', () => {
  for (const href of ['#section-2', null]) {
    const { post, prevented } = tap(href);
    expect(post).not.toHaveBeenCalled();
    expect(prevented).toBe(false);
  }
});
