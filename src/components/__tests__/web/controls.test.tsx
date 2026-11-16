import { act, fireEvent, render, screen } from '@testing-library/react';
import CardMenu from 'components/CardMenu';
import ContainedButton from 'components/ContainedButton';
import DateRangePicker from 'components/DateRangePicker';
import Divider from 'components/Divider';
import HeaderSearch from 'components/HeaderSearch';
import HeaderTitle from 'components/HeaderTitle';
import IconButton from 'components/IconButton';
import LoginFields from 'components/LoginFields';
import ProgressBar from 'components/ProgressBar';
import ScopeChips from 'components/ScopeChips';
import SegmentedTabs from 'components/SegmentedTabs';
import SelectionMark from 'components/SelectionMark';
import Spinner from 'components/Spinner';
import Switch from 'components/Switch';
import SystemIcon from 'components/SystemIcon';
import TextButton from 'components/TextButton';
// tsc reads the iOS file for 'components/ThemedHost'; Jest picks this one.
import ThemedHost from 'components/ThemedHost.web';
import { Toast, toast } from 'components/Toast';
import FluentRoot from 'web/FluentRoot';

// One file for the Electron app's small controls: each is a thin Fluent UI
// component, so the tests check what reaches it and what comes back.

const renderFluent = (children: React.ReactNode) =>
  render(<FluentRoot>{children}</FluentRoot>);

it('presses text and contained buttons unless disabled', () => {
  const onPress = jest.fn();
  renderFluent(
    <>
      <TextButton onPress={onPress} testID="text" bold size="small">
        Open
      </TextButton>
      <TextButton onPress={onPress} testID="struck" struck fill>
        old.pdf
      </TextButton>
      <TextButton onPress={onPress} testID="off" disabled size="large">
        Off
      </TextButton>
      <ContainedButton label="Go" onPress={onPress} testID="go" size="large" />
      <ContainedButton label="No" onPress={onPress} testID="no" disabled />
    </>,
  );
  for (const id of ['text', 'struck', 'off', 'go', 'no']) {
    fireEvent.click(screen.getByTestId(id));
  }
  expect(onPress).toHaveBeenCalledTimes(3);
});

it('labels an icon button, with its badge and toggled state', () => {
  const onPress = jest.fn();
  renderFluent(
    <>
      <IconButton
        icon="refresh"
        accessibilityLabel="Refresh"
        onPress={onPress}
        badge
      />
      <IconButton icon="filter" accessibilityLabel="Filter" mode="contained" />
      <IconButton icon="search" disabled onPress={onPress} testID="bare" />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Refresh, New' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('button', { name: 'Filter' }).getAttribute('aria-pressed'),
  ).toBe('true');
  fireEvent.click(screen.getByTestId('bare'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('flips a switch and shows a selection mark', () => {
  const onValueChange = jest.fn();
  renderFluent(
    <>
      <Switch
        value
        onValueChange={onValueChange}
        accessibilityLabel="Graduate"
      />
      <SelectionMark checked />
      <SelectionMark checked={false} />
    </>,
  );
  fireEvent.click(screen.getByRole('switch', { name: 'Graduate' }));
  expect(onValueChange).toHaveBeenCalledWith(false);
  expect(screen.getByTestId('icon-selected')).toBeTruthy();
  expect(screen.getByTestId('icon-unselected')).toBeTruthy();
});

it('selects tabs and scopes', () => {
  const onSelect = jest.fn();
  renderFluent(
    <>
      <SegmentedTabs
        titles={['Notices', 'Files']}
        selectedIndex={0}
        onSelect={onSelect}
        accessibilityLabel="Course"
      />
      <ScopeChips
        titles={['All', 'Mine']}
        selectedIndex={1}
        onSelect={onSelect}
      />
    </>,
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Files' }));
  expect(onSelect).toHaveBeenLastCalledWith(1);
  const [all, mine] = screen.getAllByRole('radio');
  expect(mine.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(all);
  expect(onSelect).toHaveBeenLastCalledWith(0);
});

it('shows progress, a spinner with its percentage, and dividers', () => {
  renderFluent(
    <>
      <ProgressBar progress={1.5} />
      <Spinner progress={0.42} />
      <Spinner />
      <Divider />
      <Divider vertical />
      <ThemedHost matchContents testID="host" />
      <CardMenu visible actions={[]} onAction={() => {}} onDismiss={() => {}} />
    </>,
  );
  // Fluent's spinners are progress bars too
  expect(
    screen.getAllByRole('progressbar')[0].getAttribute('aria-valuenow'),
  ).toBe('1');
  expect(screen.getByText('42%')).toBeTruthy();
  expect(screen.getAllByRole('separator')).toHaveLength(2);
  expect(screen.getByTestId('host')).toBeTruthy();
});

it('draws an icon in its color, filled where it has a variant', () => {
  const { container } = renderFluent(
    <>
      <SystemIcon name="notices" color="rgb(1, 2, 3)" filled testID="icon" />
      <SystemIcon name="attachment" color="red" size={12} />
    </>,
  );
  expect(screen.getByTestId('icon')).toBeTruthy();
  expect(container.querySelectorAll('svg')).toHaveLength(2);
});

it('titles a header and searches from it', () => {
  const onChangeText = jest.fn();
  renderFluent(
    <>
      <HeaderTitle title="Notices" subtitle="Unread" />
      <HeaderSearch
        defaultValue="hw"
        placeholder="Search"
        onChangeText={onChangeText}
      />
    </>,
  );
  expect(screen.getByRole('heading', { name: 'Notices' })).toBeTruthy();
  expect(screen.getByText('Unread')).toBeTruthy();
  const box = screen.getByRole('searchbox', { name: 'Search' });
  expect((box as HTMLInputElement).value).toBe('hw');
  fireEvent.change(box, { target: { value: 'lab' } });
  expect(onChangeText).toHaveBeenCalledWith('lab');
});

it('takes the account and password, moving on with Return', () => {
  const onUsernameChange = jest.fn();
  const onPasswordChange = jest.fn();
  const onSubmit = jest.fn();
  renderFluent(
    <LoginFields
      username=""
      password=""
      onUsernameChange={onUsernameChange}
      onPasswordChange={onPasswordChange}
      onSubmit={onSubmit}
      usernameLabel="Account"
      passwordLabel="Password"
    />,
  );
  const username = screen.getByLabelText('Account');
  const password = screen.getByLabelText('Password');
  fireEvent.change(username, { target: { value: ' me ' } });
  expect(onUsernameChange).toHaveBeenCalledWith('me');
  fireEvent.keyDown(username, { key: 'Enter' });
  expect(document.activeElement).toBe(password);
  fireEvent.change(password, { target: { value: 'pw ' } });
  expect(onPasswordChange).toHaveBeenCalledWith('pw');
  fireEvent.keyDown(password, { key: 'Enter' });
  expect(onSubmit).toHaveBeenCalled();
});

describe('DateRangePicker', () => {
  const props = {
    title: 'Export',
    startLabel: 'From',
    endLabel: 'To',
    saveLabel: 'Save',
    cancelLabel: 'Cancel',
    startDate: new Date(2026, 10, 2),
    endDate: new Date(2026, 10, 9),
  };

  it('keeps the end on or after the start, and saves the range', () => {
    const onConfirm = jest.fn();
    renderFluent(
      <DateRangePicker
        {...props}
        visible
        onConfirm={onConfirm}
        onDismiss={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-11-20' },
    });
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe(
      '2026-11-20',
    );
    // Before the start, or cleared: ignored
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-11-25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onConfirm).toHaveBeenCalledWith({
      startDate: new Date(2026, 10, 20),
      endDate: new Date(2026, 10, 25),
    });
  });

  it('closes on Cancel and Escape, and shows nothing while hidden', () => {
    const onDismiss = jest.fn();
    const { rerender } = renderFluent(
      <DateRangePicker
        {...props}
        visible
        onConfirm={() => {}}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
    rerender(
      <FluentRoot>
        <DateRangePicker
          {...props}
          startDate={undefined}
          endDate={undefined}
          visible={false}
          onConfirm={() => {}}
          onDismiss={onDismiss}
        />
      </FluentRoot>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

it('shows a toast until it times out, and hides it on an empty one', () => {
  jest.useFakeTimers();
  renderFluent(<Toast />);
  act(() => toast('Saved', 'success'));
  expect(screen.getByRole('status').textContent).toBe('Saved');
  act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(screen.queryByRole('status')).toBeNull();
  act(() => toast('Plain', 'none', { duration: 100 }));
  expect(screen.getByText('Plain')).toBeTruthy();
  act(() => toast('', 'none'));
  expect(screen.queryByRole('status')).toBeNull();
});

it('draws the other states of the small controls', () => {
  jest.useFakeTimers();
  const onSubmit = jest.fn();
  renderFluent(
    <>
      <HeaderTitle title="Plain" />
      <IconButton icon="close" />
      <LoginFields
        username="a"
        password="b"
        onUsernameChange={() => {}}
        onPasswordChange={() => {}}
        onSubmit={onSubmit}
        usernameLabel="Account"
        passwordLabel="Password"
      />
      <Toast />
    </>,
  );
  fireEvent.keyDown(screen.getByLabelText('Account'), { key: 'a' });
  fireEvent.keyDown(screen.getByLabelText('Password'), { key: 'b' });
  expect(onSubmit).not.toHaveBeenCalled();
  act(() => toast("Couldn't save", 'error'));
  expect(screen.getByRole('status')).toBeTruthy();
  act(() => toast('Careful', 'warning'));
  expect(screen.getByText('Careful')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Plain' })).toBeTruthy();
});

it('starts a date range today when it has none', () => {
  const onConfirm = jest.fn();
  renderFluent(
    <DateRangePicker
      visible
      title="Range"
      startLabel="From"
      endLabel="To"
      saveLabel="Save"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onDismiss={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  const { startDate, endDate } = onConfirm.mock.calls[0][0];
  expect(startDate).toEqual(endDate);
});
