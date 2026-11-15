import { render, screen, userEvent } from '@testing-library/react-native';
import OverflowMenu from 'components/OverflowMenu';

describe('OverflowMenu (Android)', () => {
  it('opens from the header button and runs an action', async () => {
    const onReorder = jest.fn();
    await render(
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
          { id: 'courseX', label: 'courseX', icon: 'info', onPress: jest.fn() },
        ]}
      />,
    );
    expect(screen.getByLabelText('More')).toBeTruthy();
    expect(screen.queryByText('Reorder')).toBeNull();

    await userEvent.setup().press(screen.getByTestId('more'));
    expect(screen.getByText('courseX')).toBeTruthy();
    expect(screen.getByTestId('icon-reorder')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('reorder'));
    expect(onReorder).toHaveBeenCalledTimes(1);
    // The menu closes after an action.
    expect(screen.queryByText('Reorder')).toBeNull();
  });
});
