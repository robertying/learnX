import { render, screen, userEvent } from '@testing-library/react-native';
import { ToastAndroid } from 'react-native';
import CardMenu from 'components/CardMenu';
import DateRangePicker from 'components/DateRangePicker';
import FilterMenu from 'components/FilterMenu';
import IconButton from 'components/IconButton';
import SegmentedTabs from 'components/SegmentedTabs';
import TextButton from 'components/TextButton';
import { toast } from 'components/Toast';
import { cardActions } from 'helpers/cardActions';
import { filterOptions } from 'helpers/filterOptions';

describe('IconButton (Android)', () => {
  it('presses through to the Compose button, read by its label', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton
        icon="settings"
        accessibilityLabel="Settings"
        testID="settings"
        onPress={onPress}
      />,
    );
    expect(screen.getByLabelText('Settings')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('settings'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled, and shows a badge', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton
        icon="refresh"
        testID="refresh"
        disabled
        badge
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId('badge')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('refresh'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextButton (Android)', () => {
  it('presses unless disabled', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <TextButton testID="go" onPress={onPress}>
          Log in again
        </TextButton>
        <TextButton testID="off" disabled onPress={onPress}>
          Retry
        </TextButton>
      </>,
    );
    await userEvent.setup().press(screen.getByTestId('go'));
    await userEvent.setup().press(screen.getByTestId('off'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

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

describe('CardMenu (Android)', () => {
  it("lists a card's actions while open", async () => {
    const onAction = jest.fn();
    const actions = cardActions({
      fav: false,
      archived: false,
      canHide: false,
    });
    const { rerender } = await render(
      <CardMenu
        visible={false}
        actions={actions}
        onAction={onAction}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('card-fav')).toBeNull();
    await rerender(
      <CardMenu
        visible
        actions={actions}
        onAction={onAction}
        onDismiss={jest.fn()}
      />,
    );
    await userEvent.setup().press(screen.getByTestId('card-archive'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'archive' }),
    );
  });
});

describe('SegmentedTabs (Android)', () => {
  it('selects the tab pressed', async () => {
    const onSelect = jest.fn();
    await render(
      <SegmentedTabs
        titles={['Notices', 'Assignments', 'Files']}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    );
    await userEvent.setup().press(screen.getByText('Files'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

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

describe('toast (Android)', () => {
  it('shows the system toast, longer for errors, and skips empty text', () => {
    const show = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    toast('Saved', 'success');
    toast('Failed', 'error');
    toast('', 'none');
    expect(show.mock.calls).toEqual([
      ['Saved', ToastAndroid.SHORT],
      ['Failed', ToastAndroid.LONG],
    ]);
  });
});
