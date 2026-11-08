import {
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import Filter, { FilterProps } from 'components/Filter';

const rowIds = () =>
  screen
    .getAllByTestId(/^filter-/)
    .map(node => String(node.props.testID).replace('filter-', ''));

const setup = async (props: Partial<FilterProps> = {}) => {
  const onSelectionChange = jest.fn();
  const view = await render(
    <Filter
      visible
      selected="all"
      onSelectionChange={onSelectionChange}
      allCount={10}
      hiddenCount={1}
      {...props}
    />,
  );
  return { ...view, onSelectionChange };
};

const row = (name: string) => screen.getByTestId(`filter-${name}`);

describe('Filter', () => {
  it('shows only all and hidden when a list has no other filters', async () => {
    await setup();
    expect(rowIds()).toEqual(['all', 'hidden']);
    expect(within(row('all')).getByText('10')).toBeTruthy();
    expect(within(row('hidden')).getByText('1')).toBeTruthy();
  });

  it('shows the notice and file filters in order with their counts', async () => {
    await setup({ unreadCount: 3, favCount: 2, archivedCount: 4 });
    expect(rowIds()).toEqual(['all', 'unread', 'fav', 'archived', 'hidden']);
    expect(within(row('unread')).getByText('unread')).toBeTruthy();
    expect(within(row('unread')).getByText('3')).toBeTruthy();
    expect(within(row('fav')).getByText('favorite')).toBeTruthy();
    expect(within(row('fav')).getByText('2')).toBeTruthy();
    expect(within(row('archived')).getByText('4')).toBeTruthy();
  });

  it('counts finished assignments as all minus unfinished', async () => {
    await setup({ unfinishedCount: 7, favCount: 0, archivedCount: 0 });
    expect(rowIds()).toEqual([
      'unfinished',
      'finished',
      'all',
      'fav',
      'archived',
      'hidden',
    ]);
    expect(within(row('unfinished')).getByText('7')).toBeTruthy();
    expect(within(row('finished')).getByText('3')).toBeTruthy();
  });

  it('tells screen readers which filter is selected, with its count', async () => {
    await setup({ unreadCount: 3, selected: 'unread' });
    expect(row('unread').props.accessibilityState).toEqual({ selected: true });
    expect(row('all').props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByRole('button', { name: 'unread, 3' })).toBe(
      row('unread'),
    );
  });

  it('checks the selected filter only', async () => {
    const view = await setup({ unreadCount: 3, selected: 'unread' });
    expect(within(row('unread')).getByTestId('icon-check')).toBeTruthy();
    expect(within(row('all')).queryByTestId('icon-check')).toBeNull();

    await view.rerender(
      <Filter
        visible
        selected="hidden"
        onSelectionChange={view.onSelectionChange}
        allCount={10}
        unreadCount={3}
        hiddenCount={1}
      />,
    );
    expect(within(row('hidden')).getByTestId('icon-check')).toBeTruthy();
    expect(within(row('unread')).queryByTestId('icon-check')).toBeNull();
  });

  it('reports the tapped filter', async () => {
    const { onSelectionChange } = await setup({ unreadCount: 3 });
    const user = userEvent.setup();
    await user.press(row('unread'));
    expect(onSelectionChange).toHaveBeenCalledWith('unread');
    await user.press(row('hidden'));
    expect(onSelectionChange).toHaveBeenLastCalledWith('hidden');
  });
});
