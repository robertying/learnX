import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import {
  Form,
  FormButton,
  FormFile,
  FormLink,
  FormNumberField,
  FormParagraph,
  FormProgress,
  FormSection,
  FormText,
  FormTextField,
  FormTitle,
  FormToggle,
  FormView,
  parseNumberInput,
  positionRows,
  sectionRows,
  useFieldText,
} from 'components/Form';
import DeviceInfo from 'constants/DeviceInfo';

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

  it('titles a section on the Mac with its own header', async () => {
    const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    await render(
      <FormSection title="Content">
        <FormText title="Total" />
      </FormSection>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
    isMac.mockRestore();
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

  it('shows a paragraph as a row of its own', async () => {
    await render(
      <FormSection title="Description">
        <FormParagraph text="Lecture 1 slides" headline testID="name" />
        <FormParagraph text={'Read before class.\nBring questions.'} />
      </FormSection>,
    );
    expect(screen.getByTestId('name')).toHaveTextContent('Lecture 1 slides');
    expect(
      screen.getByText('Read before class.\nBring questions.'),
    ).toBeTruthy();
  });

  it('shows a subtitle, a done check and progress', async () => {
    await render(
      <FormSection>
        <FormText title="Calculus" subtitle="Room 101" done />
        <FormLink
          title="Physics"
          subtitle="08:00–09:35"
          progress={0.5}
          onPress={jest.fn()}
        />
      </FormSection>,
    );
    expect(screen.getByText('Room 101')).toBeTruthy();
    expect(screen.getByText('08:00–09:35')).toBeTruthy();
    expect(screen.getByTestId('icon-checkmark')).toBeTruthy();
    expect(screen.getByTestId('progress')).toBeTruthy();
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

  it('keeps a text field and its value in step', async () => {
    const Field = () => {
      const [value, setValue] = useState('Draft');
      return (
        <>
          <FormTextField
            placeholder="Name"
            value={value}
            onChangeText={setValue}
            format={text => {
              'worklet';
              return text.replaceAll('.', '');
            }}
          />
          <FormButton title="Clear" onPress={() => setValue('')} />
        </>
      );
    };
    await render(<Field />);
    const field = screen.getByLabelText('Name');
    expect(field.props.value).toBe('Draft');
    // Formatted text goes back to the field once typing pauses.
    await fireEvent.changeText(field, 'a.b');
    await waitFor(() =>
      expect(screen.getByLabelText('Name').props.value).toBe('ab'),
    );
    // A value set from outside replaces what was typed.
    await userEvent.setup().press(screen.getByText('Clear'));
    expect(screen.getByLabelText('Name').props.value).toBe('');
  });

  it('dims disabled rows and fields', async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormTextField
          placeholder="Content"
          value=""
          onChangeText={jest.fn()}
          disabled
        />
        <FormFile title="report.pdf" disabled onPress={onPress} />
        <FormButton title="Remove" destructive disabled onPress={onPress} />
      </FormSection>,
    );
    expect(screen.getByLabelText('Content').props.editable).toBe(false);
    await userEvent.setup().press(screen.getByText('report.pdf'));
    await userEvent.setup().press(screen.getByText('Remove'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('opens a file row', async () => {
    const onPress = jest.fn();
    await render(
      <FormFile
        title="report.pdf"
        icon={{ ios: 'doc', android: 'file-outline' }}
        struck
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId('icon-doc')).toBeTruthy();
    await userEvent.setup().press(screen.getByText('report.pdf'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows progress under its title', async () => {
    await render(<FormProgress title="Uploading" value={0.4} />);
    expect(screen.getByText('Uploading')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      now: 40,
    });
  });

  it('shows a detail page title, a tinted detail and a hosted view', async () => {
    await render(
      <Form>
        <FormSection>
          <FormTitle title="Problem set 3" subtitle="Complete Individually" />
        </FormSection>
        <FormSection>
          <FormText title="Grade" detail="80" detailTint="accent" />
          <FormFile
            title="answers.pdf"
            subtitle="By Anonymous"
            onPress={jest.fn()}
          />
        </FormSection>
        <FormSection title="Description">
          <FormView>
            <Text>Chapters 4 and 5</Text>
          </FormView>
        </FormSection>
      </Form>,
    );
    expect(screen.getByText('Problem set 3')).toBeTruthy();
    expect(screen.getByText('Complete Individually')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('By Anonymous')).toBeTruthy();
    expect(screen.getByText('Chapters 4 and 5')).toBeTruthy();
  });
});

describe('form helpers', () => {
  it("doesn't write a late value over newer typed text", async () => {
    let fieldText = 'a';
    const text = {
      get: () => fieldText,
      set: jest.fn(),
      onChange: null as ((value: string) => void) | null,
    };
    const onChangeText = jest.fn();
    const { rerender } = await renderHook(
      ({ value }: { value: string }) =>
        useFieldText(text, { value, onChangeText }),
      { initialProps: { value: 'a' } },
    );
    // Two keys reach JS before the first one renders.
    fieldText = 'abc';
    await act(() => {
      text.onChange?.('ab');
      text.onChange?.('abc');
    });
    await rerender({ value: 'ab' });
    await rerender({ value: 'abc' });
    expect(text.set).not.toHaveBeenCalled();
    expect(onChangeText).toHaveBeenLastCalledWith('abc');
    // A value the field never reported, like a cleared draft, is written.
    await rerender({ value: '' });
    expect(text.set).toHaveBeenCalledWith('');
  });

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
