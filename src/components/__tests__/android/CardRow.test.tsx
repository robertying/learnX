import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import CardRow, { CardGutter } from 'components/CardRow';

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

describe('CardRow (Android)', () => {
  it('sets only unread titles bolder, with no unread gutter', async () => {
    await render(
      <>
        <CardGutter unread />
        <CardRow title="Read" unread={false} trailing="10:00" />
        <CardRow title="Never unread" />
        <CardRow title="Unread" unread />
      </>,
    );
    expect(screen.queryByTestId('unread-dot')).toBeNull();
    expect(style(screen.getByText('Read')).fontWeight).toBe('400');
    expect(style(screen.getByText('Never unread')).fontWeight).toBe('400');
    expect(style(screen.getByText('Unread')).fontWeight).not.toBe('400');
    expect(screen.getByText('10:00')).toBeTruthy();
  });
});
