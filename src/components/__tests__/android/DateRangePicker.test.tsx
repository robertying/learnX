import { render, screen, userEvent } from '@testing-library/react-native';
import DateRangePicker from 'components/DateRangePicker';

describe('DateRangePicker (Android)', () => {
  const props = {
    title: 'Sync range',
    startLabel: 'Start',
    endLabel: 'End',
    saveLabel: 'Save',
    cancelLabel: 'Cancel',
  };

  it('hands Compose UTC-midnight days and reads the picks back as local days', async () => {
    const onConfirm = jest.fn();
    await render(
      <DateRangePicker
        {...props}
        visible
        startDate={new Date(2026, 2, 1, 23, 30)}
        endDate={new Date(2026, 5, 30, 0, 15)}
        onConfirm={onConfirm}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByTestId('date-range-start')).toHaveTextContent(
      '2026-03-01T00:00:00.000Z',
    );
    await userEvent.setup().press(screen.getByText('Save'));
    expect(onConfirm).toHaveBeenCalledWith({
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 5, 30),
    });
  });

  it('shows nothing until visible, and cancels', async () => {
    const onDismiss = jest.fn();
    const { rerender } = await render(
      <DateRangePicker
        {...props}
        visible={false}
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByTestId('date-range-picker')).toBeNull();
    await rerender(
      <DateRangePicker
        {...props}
        visible
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.setup().press(screen.getByText('Cancel'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
