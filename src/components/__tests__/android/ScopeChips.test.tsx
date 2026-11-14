import { render, screen, userEvent } from '@testing-library/react-native';
import ScopeChips from 'components/ScopeChips';

describe('ScopeChips (Android)', () => {
  it('checks the selected chip and picks another', async () => {
    const onSelect = jest.fn();
    await render(
      <ScopeChips
        titles={['All', 'Notices', 'Assignments', 'Files']}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'All' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Assignments' }),
    ).not.toBeChecked();
    await userEvent.setup().press(screen.getByText('Assignments'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
