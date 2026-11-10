import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import DateRangePicker, {
  type DateRangePickerProps,
} from 'components/DateRangePicker';

const props = (
  overrides: Partial<DateRangePickerProps> = {},
): DateRangePickerProps => ({
  visible: true,
  title: 'Sync Schedule',
  startLabel: 'Start',
  endLabel: 'End',
  saveLabel: 'Save',
  cancelLabel: 'Cancel',
  startDate: new Date('2026-11-10T00:00:00Z'),
  endDate: new Date('2026-12-08T00:00:00Z'),
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
  ...overrides,
});

const pick = (picker: 'Start' | 'End', date: string) =>
  fireEvent(
    screen.getByTestId(`date-picker-${picker}`),
    'dateChange',
    new Date(date),
  );

it('saves the picked range', async () => {
  const p = props();
  await render(<DateRangePicker {...p} />);
  expect(screen.getByText('2026-11-10')).toBeTruthy();
  await pick('End', '2026-11-20T00:00:00Z');
  await userEvent.press(screen.getByText('Save'));
  expect(p.onConfirm).toHaveBeenCalledWith({
    startDate: new Date('2026-11-10T00:00:00Z'),
    endDate: new Date('2026-11-20T00:00:00Z'),
  });
});

it('moves the end along when the start passes it', async () => {
  const p = props();
  await render(<DateRangePicker {...p} />);
  await pick('Start', '2026-12-20T00:00:00Z');
  await userEvent.press(screen.getByText('Save'));
  expect(p.onConfirm).toHaveBeenCalledWith({
    startDate: new Date('2026-12-20T00:00:00Z'),
    endDate: new Date('2026-12-20T00:00:00Z'),
  });
});

it('starts from today, ending the same day, without dates', async () => {
  jest.useFakeTimers({ now: Date.parse('2026-11-10T08:00:00Z') });
  const p = props({ startDate: undefined, endDate: undefined });
  await render(<DateRangePicker {...p} />);
  expect(screen.getAllByText('2026-11-10')).toHaveLength(2);
  jest.useRealTimers();
});

it('dismisses on Cancel and on a swipe down, not once closed', async () => {
  const p = props();
  const view = await render(<DateRangePicker {...p} />);
  await userEvent.press(screen.getByText('Cancel'));
  expect(p.onDismiss).toHaveBeenCalledTimes(1);

  await fireEvent(
    screen.getByTestId('bottom-sheet'),
    'isPresentedChange',
    false,
  );
  expect(p.onDismiss).toHaveBeenCalledTimes(2);

  // Closing through `visible` (after Save) isn't a dismissal.
  await view.rerender(<DateRangePicker {...p} visible={false} />);
  expect(screen.queryByText('Save')).toBeNull();
  await fireEvent(
    screen.getByTestId('bottom-sheet'),
    'isPresentedChange',
    false,
  );
  expect(p.onDismiss).toHaveBeenCalledTimes(2);
  expect(p.onConfirm).not.toHaveBeenCalled();
});
