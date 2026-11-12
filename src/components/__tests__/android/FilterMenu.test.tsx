import { render, screen, userEvent } from '@testing-library/react-native';
import FilterMenu from 'components/FilterMenu';
import { filterOptions } from 'helpers/filters';

describe('FilterMenu (Android)', () => {
  it('opens from the header button and picks a filter', async () => {
    const onSelectionChange = jest.fn();
    await render(
      <FilterMenu
        label="Filter"
        options={filterOptions({
          allCount: 12,
          unreadCount: 3,
          hiddenCount: 0,
        })}
        selected="all"
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.queryByTestId('filter-unread')).toBeNull();
    await userEvent.setup().press(screen.getByTestId('filter'));
    expect(screen.getByText('3')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('filter-unread'));
    expect(onSelectionChange).toHaveBeenCalledWith('unread');
    expect(screen.queryByTestId('filter-unread')).toBeNull();
  });
});
