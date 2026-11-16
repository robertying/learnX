import { fireEvent, render, screen } from '@testing-library/react';
import FilterMenu from 'components/FilterMenu';
import OverflowMenu from 'components/OverflowMenu';
import ToggleMenu from 'components/ToggleMenu';
import FluentRoot from 'web/FluentRoot';

// The header menus: a Fluent menu button each.

const renderFluent = (children: React.ReactNode) =>
  render(<FluentRoot>{children}</FluentRoot>);

it('runs an overflow menu action', async () => {
  const onReorder = jest.fn();
  renderFluent(
    <OverflowMenu
      label="More"
      testID="more"
      items={[
        {
          id: 'reorder',
          label: 'Reorder',
          icon: 'reorder',
          onPress: onReorder,
        },
        { id: 'info', label: 'Info', icon: 'info', onPress: () => {} },
      ]}
    />,
  );
  fireEvent.click(screen.getByTestId('more'));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Reorder' }));
  expect(onReorder).toHaveBeenCalled();
});

it('checks the current filter, with counts, and picks another', async () => {
  const onSelectionChange = jest.fn();
  renderFluent(
    <FilterMenu
      label="Filter"
      selected="unread"
      options={[
        { name: 'all', label: 'All', count: 20, icon: 'all' },
        { name: 'unread', label: 'Unread', count: 6, icon: 'unread' },
      ]}
      onSelectionChange={onSelectionChange}
    />,
  );
  fireEvent.click(screen.getByTestId('filter'));
  const unread = await screen.findByRole('menuitemradio', { name: /Unread/ });
  expect(unread.getAttribute('aria-checked')).toBe('true');
  expect(screen.getByText('20')).toBeTruthy();
  fireEvent.click(screen.getByRole('menuitemradio', { name: /All/ }));
  expect(onSelectionChange).toHaveBeenCalledWith('all');
});

it('turns options on and off', async () => {
  const onToggle = jest.fn();
  renderFluent(
    <ToggleMenu
      label="Filter"
      active={false}
      options={[
        { name: 'archived', label: 'Archived', icon: 'archived', on: true },
        { name: 'hidden', label: 'Hidden', icon: 'hide', on: false },
      ]}
      onToggle={onToggle}
    />,
  );
  fireEvent.click(screen.getByTestId('filter'));
  fireEvent.click(
    await screen.findByRole('menuitemcheckbox', { name: 'Hidden' }),
  );
  expect(onToggle).toHaveBeenLastCalledWith('hidden');
  // The menu stays open, as the options each turn on or off.
  fireEvent.click(
    await screen.findByRole('menuitemcheckbox', { name: 'Archived' }),
  );
  expect(onToggle).toHaveBeenLastCalledWith('archived');
});

it('shows a menu of plain items without icons', async () => {
  const onPress = jest.fn();
  renderFluent(
    <OverflowMenu
      label="More"
      items={[{ id: 'a', label: 'Plain', icon: 'info', onPress }]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Plain' }));
  expect(onPress).toHaveBeenCalled();
});
