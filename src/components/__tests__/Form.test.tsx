import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import {
  Form,
  FormButton,
  FormLink,
  FormNumberField,
  FormSection,
  FormText,
  FormToggle,
  parseNumberInput,
  positionRows,
  sectionRows,
} from 'components/Form';

describe('Form', () => {
  it('opens a page from a link row with a chevron', async () => {
    const onPress = jest.fn();
    await render(
      <Form>
        <FormSection footer="Pick the semester to show">
          <FormLink
            title="Semester"
            icon={{ ios: 'calendar', android: 'calendar' }}
            onPress={onPress}
          />
        </FormSection>
      </Form>,
    );
    expect(screen.getByText('Pick the semester to show')).toBeTruthy();
    expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    expect(screen.getByTestId('icon-chevron.right')).toBeTruthy();
    await userEvent.setup().press(screen.getByText('Semester'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a detail at the end of a row', async () => {
    await render(
      <FormSection>
        <FormText title="Total" detail="3 files · 1 MB" />
        <FormLink title="Downloads" detail="1 MB" onPress={jest.fn()} />
      </FormSection>,
    );
    expect(screen.getByText('3 files · 1 MB')).toBeTruthy();
    expect(screen.getByText('1 MB')).toBeTruthy();
  });

  it('makes a toggle row one switch', async () => {
    const onValueChange = jest.fn();
    await render(
      <FormToggle title="Sync calendar" value onValueChange={onValueChange} />,
    );
    const toggle = screen.getByRole('switch', { name: 'Sync calendar' });
    expect(toggle).toBeChecked();
    await fireEvent(toggle, 'valueChange', false);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('shows a spinner instead of the switch while loading', async () => {
    await render(
      <FormToggle
        title="Sync calendar"
        value
        onValueChange={jest.fn()}
        loading
      />,
    );
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText('Sync calendar')).toBeTruthy();
    expect(screen.getByTestId('progress')).toBeTruthy();
  });

  it('marks the chosen row of a list', async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormButton title="Spring" selected onPress={jest.fn()} />
        <FormButton title="Fall" selected={false} onPress={onPress} />
      </FormSection>,
    );
    expect(screen.getAllByTestId('icon-checkmark')).toHaveLength(1);
    await userEvent.setup().press(screen.getByText('Fall'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies positive whole numbers typed in a number field', async () => {
    const onValueChange = jest.fn();
    await render(
      <FormNumberField
        title="Minutes before"
        value={15}
        onValueChange={onValueChange}
      />,
    );
    const field = screen.getByLabelText('Minutes before');
    expect(field.props.defaultValue).toBe('15');
    await fireEvent.changeText(field, '');
    await fireEvent.changeText(field, '0');
    await fireEvent.changeText(field, '30');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(30);
  });
});

describe('form helpers', () => {
  it('ignores input that is not a positive number', () => {
    const apply = jest.fn();
    ['', 'abc', '0', '-5'].forEach(parseNumberInput(apply));
    expect(apply).not.toHaveBeenCalled();
    parseNumberInput(apply)('12');
    expect(apply).toHaveBeenCalledWith(12);
  });

  it('flattens fragments and drops empty rows', () => {
    const rows = sectionRows(
      <>
        <FormLink title="A" onPress={jest.fn()} />
        {false}
        <>
          <FormLink title="B" onPress={jest.fn()} />
          {null}
        </>
      </>,
    );
    expect(rows.map(row => (row.props as { title: string }).title)).toEqual([
      'A',
      'B',
    ]);
  });

  it('tells each row where it is in its section', () => {
    const rows = (count: number) =>
      positionRows(
        Array.from({ length: count }, (_, i) => (
          <FormLink key={i} title={String(i)} onPress={jest.fn()} />
        )),
      ).map(row => (row.props as { position: string }).position);
    expect(rows(1)).toEqual(['only']);
    expect(rows(3)).toEqual(['first', 'middle', 'last']);
  });
});
