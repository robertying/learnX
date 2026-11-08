import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import TableCell from 'components/TableCell';

describe('TableCell', () => {
  it('shows its texts and runs onPress on tap', async () => {
    const onPress = jest.fn();
    await render(
      <TableCell
        type="arrow"
        primaryText="Semester"
        secondaryText="2025-2026 Spring"
        onPress={onPress}
      />,
    );
    expect(screen.getByText('Semester')).toBeTruthy();
    expect(screen.getByText('2025-2026 Spring')).toBeTruthy();
    expect(screen.getByTestId('icon-keyboard-arrow-right')).toBeTruthy();
    await userEvent.setup().press(screen.getByText('Semester'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('makes a switch row one switch for accessibility', async () => {
    const onSwitchValueChange = jest.fn();
    await render(
      <TableCell
        type="switch"
        primaryText="Sync calendar"
        switchValue
        onSwitchValueChange={onSwitchValueChange}
      />,
    );
    // Only the row is exposed; the switch inside is hidden
    const row = screen.getByRole('switch', { name: 'Sync calendar' });
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(row).toBeChecked();
    await fireEvent(row, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onSwitchValueChange).toHaveBeenCalledWith(false);
  });

  it('reports a flip of the switch itself', async () => {
    const onSwitchValueChange = jest.fn();
    await render(
      <TableCell
        type="switch"
        primaryText="Sync calendar"
        switchValue
        onSwitchValueChange={onSwitchValueChange}
      />,
    );
    const toggles = screen.getAllByRole('switch', {
      includeHiddenElements: true,
    });
    expect(toggles).toHaveLength(2);
    await fireEvent(toggles[1], 'valueChange', false);
    expect(onSwitchValueChange).toHaveBeenCalledWith(false);
  });

  it('ignores activate on a disabled switch row', async () => {
    const onSwitchValueChange = jest.fn();
    await render(
      <TableCell
        type="switch"
        primaryText="Sync calendar"
        switchValue
        switchDisabled
        onSwitchValueChange={onSwitchValueChange}
      />,
    );
    const row = screen.getByRole('switch', { name: 'Sync calendar' });
    expect(row).toBeDisabled();
    await fireEvent(row, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onSwitchValueChange).not.toHaveBeenCalled();
  });

  it('shows a spinner in place of the switch while loading', async () => {
    const view = await render(
      <TableCell
        type="switch"
        primaryText="Sync calendar"
        switchValue
        loading
      />,
    );
    expect(screen.queryByRole('switch')).toBeNull();
    expect(
      view.container.queryAll(node => node.type === 'ActivityIndicator'),
    ).toHaveLength(1);
  });

  it('edits a number in an input cell', async () => {
    const onInputValueChange = jest.fn();
    await render(
      <TableCell
        type="input"
        primaryText="Minutes before"
        inputValue="15"
        onInputValueChange={onInputValueChange}
      />,
    );
    const input = screen.getByDisplayValue('15');
    expect(input.props.keyboardType).toBe('number-pad');
    await fireEvent.changeText(input, '30');
    expect(onInputValueChange).toHaveBeenCalledWith('30');
  });
});
