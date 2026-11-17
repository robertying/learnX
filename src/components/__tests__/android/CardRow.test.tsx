import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import CardRow from 'components/CardRow';
import { useTheme } from 'theme';

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never);

let primary: unknown;
const Primary = () => {
  primary = useTheme().colors.primary;
  return null;
};

describe('CardRow (Android)', () => {
  it('marks unread rows with a dot in the primary color, not a bolder title', async () => {
    await render(
      <>
        <Primary />
        <CardRow title="Read" unread={false} trailing="10:00" />
        <CardRow title="Never unread" />
        <CardRow title="Unread" unread />
      </>,
    );
    const dots = screen.getAllByTestId('unread-dot');
    expect(dots).toHaveLength(1);
    expect(style(dots[0]).backgroundColor).toBe(primary);
    for (const title of ['Read', 'Never unread', 'Unread']) {
      expect(style(screen.getByText(title)).fontWeight).toBe('500');
    }
    // The default typeface, which draws every weight (a named family draws
    // only normal and bold).
    expect(style(screen.getByText('Unread')).fontFamily).toBeUndefined();
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('centers the dot on the first line, the overline or the title', async () => {
    await render(
      <>
        <CardRow overline="Course" title="With overline" unread />
        <CardRow title="Title first" unread />
      </>,
    );
    const [withOverline, titleFirst] = screen
      .getAllByTestId('unread-dot')
      .map(dot => style(dot.parent!).paddingTop as number);
    // An 8 dp dot in a 16 dp footnote line and a 24 dp title line, under the
    // content's 2 dp of padding.
    expect(withOverline).toBe(6);
    expect(titleFirst).toBe(10);
  });
});
