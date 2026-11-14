import { render, screen, userEvent } from '@testing-library/react-native';
import ToggleMenu from 'components/ToggleMenu';

describe('ToggleMenu (Android)', () => {
  it('opens from the header button and toggles options, staying open', async () => {
    const onToggle = jest.fn();
    await render(
      <ToggleMenu
        label="Filter"
        options={[
          {
            name: 'archived',
            label: 'Archived Items',
            icon: 'archived',
            on: true,
          },
          { name: 'hidden', label: 'Hidden Courses', icon: 'hide', on: false },
        ]}
        active={false}
        onToggle={onToggle}
      />,
    );
    expect(screen.queryByTestId('filter-hidden')).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByTestId('filter'));
    expect(screen.getByText('Archived Items')).toBeTruthy();
    expect(screen.getByTestId('filter-archived-checked')).toBeTruthy();
    expect(screen.queryByTestId('filter-hidden-checked')).toBeNull();
    await user.press(screen.getByTestId('filter-hidden'));
    expect(onToggle).toHaveBeenCalledWith('hidden');
    expect(screen.getByTestId('filter-archived')).toBeTruthy();
  });
});
