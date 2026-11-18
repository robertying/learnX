import { render, screen } from '@testing-library/react-native';
import HeaderTitle from 'components/HeaderTitle';

it('shows a title with its subtitle', async () => {
  await render(<HeaderTitle title="Title" subtitle="Subtitle" />);
  expect(screen.getByText('Title')).toBeTruthy();
  expect(screen.getByText('Subtitle')).toBeTruthy();
  await render(<HeaderTitle title="Title" />);
  expect(screen.queryByText('Subtitle')).toBeNull();
});

it("shortens an item's title in the middle, and its subtitle at the end", async () => {
  await render(
    <HeaderTitle title="Title" subtitle="Subtitle" ellipsizeMode="middle" />,
  );
  expect(screen.getByText('Title').props.ellipsizeMode).toBe('middle');
  expect(screen.getByText('Subtitle').props.ellipsizeMode ?? 'tail').toBe(
    'tail',
  );
});
