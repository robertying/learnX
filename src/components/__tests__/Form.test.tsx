import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard, PlatformColor, Text } from 'react-native';
import {
  Form,
  FormButton,
  FormChoiceButton,
  FormFile,
  FormLink,
  FormNumberField,
  FormParagraph,
  FormScreen,
  FormSection,
  FormText,
  FormTextField,
  FormTitle,
  FormToggle,
  FormView,
  parseNumberInput,
  positionRows,
  sectionRows,
} from 'components/Form';
import { accessibilityValue } from '@expo/ui/swift-ui/modifiers';
import { NavigationContext } from '@react-navigation/native';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  listRowBackground,
  listRowSeparator,
  listSectionMargins,
} from '@expo/ui/swift-ui/modifiers';
import { FormProfile } from 'components/Form';
import DeviceInfo from 'constants/DeviceInfo';
import { setFontScale } from 'test-utils/fontScale';
import { BrandLightTheme } from 'theme';

describe('Form', () => {
  it("asks from a row with the row's own sheet", async () => {
    const exportCourse = jest.fn();
    const remove = jest.fn();
    const onCancel = jest.fn();
    await render(
      <Form>
        <FormSection>
          <FormChoiceButton
            title="物理"
            detail="3 files"
            sheet={{
              title: '物理',
              message: '3 files · 2 KB',
              choices: [
                { label: 'Export', onPress: exportCourse },
                { label: 'Delete', onPress: remove, destructive: true },
              ],
              onCancel,
            }}
          />
        </FormSection>
      </Form>,
    );
    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
    await userEvent.press(screen.getByText('物理'));
    expect(screen.getByText('3 files · 2 KB')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' }).props).toMatchObject({
      accessibilityHint: 'destructive',
    });
    await userEvent.press(screen.getByText('Export'));
    expect(exportCourse).toHaveBeenCalled();
    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.press(screen.getByText('物理'));
    await userEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });

  it('opens a page from a link row with a chevron', async () => {
    const onPress = jest.fn();
    await render(
      <Form>
        <FormSection footer="Pick the semester to show">
          <FormLink title="Semester" icon="calendar" onPress={onPress} />
        </FormSection>
      </Form>,
    );
    expect(screen.getByText('Pick the semester to show')).toBeTruthy();
    expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    expect(screen.getByTestId('icon-chevron.right')).toBeTruthy();
    // Not read out as "Forward"
    expect(
      screen.getByTestId('icon-chevron.right').props.modifiers,
    ).toContainEqual(accessibilityHidden(true));
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

  it('draws the Mac rows padded, with tinted actions', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    const onToggle = jest.fn();
    await render(
      <FormSection title="Calendar" footer="Synced weekly">
        <FormToggle
          title="Add to Calendar"
          icon="calendar"
          value={false}
          onValueChange={onToggle}
        />
        <FormButton title="Sync" icon="sync" onPress={jest.fn()} />
      </FormSection>,
    );
    // The row's own icon and label instead of the Mac's crowded label
    expect(screen.getByText('Add to Calendar')).toBeTruthy();
    expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);
    expect(onToggle).toHaveBeenCalledWith(true);
    // An action in the tint: no label color on its title, at body's size
    // as every row's title (a button's label is smaller on its own)
    expect(screen.getByText('Sync').props.modifiers).toEqual([
      font({ textStyle: 'body' }),
    ]);
    // The footer in the footnote style, its lines spaced apart
    expect(screen.getByText('Synced weekly').props.modifiers).toHaveLength(2);
  });

  it("keeps a row's id off its action, which has its own", async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormText
          title="Couldn't log in"
          testID="status"
          action={{ title: 'Log In', onPress, testID: 'status-relogin' }}
        />
      </FormSection>,
    );
    // The row is a container element with the id, not a stack that hands
    // it to every element in it.
    expect(accessibilityElement).toHaveBeenCalledWith('contain');
    expect(accessibilityIdentifier).toHaveBeenCalledWith('status');
    await userEvent.setup().press(screen.getByTestId('status-relogin'));
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

  it('puts a button at the end of a text row', async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormText
          title="Couldn't log in"
          subtitle="updated 5 minutes ago"
          action={{ title: 'Log In', onPress, testID: 'log-in' }}
        />
      </FormSection>,
    );
    expect(screen.getByText("Couldn't log in")).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('log-in'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a subtitle, dims a row that is over, and progress', async () => {
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
    // over is read out, not drawn as a checkmark
    expect(screen.queryByTestId('icon-checkmark')).toBeNull();
    expect(accessibilityValue).toHaveBeenCalledWith('Ended');
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
    // Read out as Selected, not as "Checkmark"
    expect(screen.getByTestId('icon-checkmark').props.modifiers).toContainEqual(
      accessibilityHidden(true),
    );
    expect(
      screen.getByRole('button', { name: 'Spring', selected: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Fall', selected: false }),
    ).toBeTruthy();
    await userEvent.setup().press(screen.getByText('Fall'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the link whose page is open beside the Form as selected', async () => {
    await render(
      <FormSection>
        <FormLink title="Notifications" opened onPress={jest.fn()} />
        <FormLink title="Downloads" onPress={jest.fn()} />
      </FormSection>,
    );
    const open = screen.getByRole('button', {
      name: 'Notifications',
      selected: true,
    });
    // In the gray of a list's selected row
    expect(open.props.modifiers).toContainEqual(
      listRowBackground(PlatformColor('systemGray4')),
    );
    // with no separators running into it
    expect(open.props.modifiers).toContainEqual(
      listRowSeparator('hidden', 'all'),
    );
    const closed = screen.getByRole('button', {
      name: 'Downloads',
      selected: false,
    });
    expect(closed.props.modifiers).toBeUndefined();
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

  it('shows Done in the header while a number is typed, except on the Mac', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const navigation = { setOptions: jest.fn() };
    const numberForm = (
      <NavigationContext.Provider value={navigation as never}>
        <Form>
          <FormSection>
            <FormNumberField
              title="Minutes"
              value={15}
              onValueChange={jest.fn()}
            />
          </FormSection>
        </Form>
      </NavigationContext.Provider>
    );
    const headerRight = () =>
      navigation.setOptions.mock.calls
        .map(([options]) => options)
        .findLast(options => 'headerRight' in options)?.headerRight;
    await render(numberForm);
    expect(headerRight()).toBeUndefined();

    await fireEvent(screen.getByLabelText('Minutes'), 'focus');
    await render(<>{headerRight()()}</>);
    await userEvent.setup().press(screen.getByTestId('keyboard-done'));
    expect(dismiss).toHaveBeenCalled();

    await render(numberForm);
    await fireEvent(screen.getByLabelText('Minutes'), 'focus');
    await fireEvent(screen.getByLabelText('Minutes'), 'blur');
    await render(<>{headerRight()()}</>);
    expect(screen.queryByTestId('keyboard-done')).toBeNull();

    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    navigation.setOptions.mockClear();
    await render(numberForm);
    await fireEvent(screen.getByLabelText('Minutes'), 'focus');
    expect(headerRight()).toBeUndefined();
  });

  it('names a text field for screen readers by its label', async () => {
    await render(
      <FormSection>
        <FormTextField
          value=""
          onChangeText={jest.fn()}
          placeholder="Optional"
          label="Content"
        />
      </FormSection>,
    );
    expect(screen.getByLabelText('Content')).toBeTruthy();
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
      <FormFile title="report.pdf" icon="file" struck onPress={onPress} />,
    );
    expect(screen.getByTestId('icon-doc')).toBeTruthy();
    await userEvent.setup().press(screen.getByText('report.pdf'));
    expect(onPress).toHaveBeenCalledTimes(1);
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

  it('shows a spinner over a view that is still loading, keeping it mounted', async () => {
    const view = (loading: boolean) => (
      <FormView loading={loading}>
        <Text>Chapters 4 and 5</Text>
      </FormView>
    );
    await render(view(true));
    expect(screen.getByTestId('progress')).toBeTruthy();
    expect(screen.getByText('Chapters 4 and 5')).toBeTruthy();
    await screen.rerender(view(false));
    expect(screen.queryByTestId('progress')).toBeNull();
    expect(screen.getByText('Chapters 4 and 5')).toBeTruthy();
  });
  it("keeps the Form inside the screen's view, where UIKit finds its scroll view", async () => {
    await render(
      <FormScreen testID="screen">
        <Form testID="form">
          <FormSection>
            <FormText title="Row" />
          </FormSection>
        </Form>
      </FormScreen>,
    );
    // A collapsable view with only a background would have its children
    // mounted beside it, and the large title would never collapse.
    expect(screen.getByTestId('screen')).toHaveProp('collapsable', false);
    expect(screen.getByTestId('screen')).toContainElement(
      screen.getByTestId('form'),
    );
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

describe('Form (iOS details)', () => {
  it('continues the grouped background into the header, and gives it back', async () => {
    const navigation = { setOptions: jest.fn() };
    await render(
      <NavigationContext.Provider value={navigation as never}>
        <Form>
          <FormSection>
            <FormText title="Row" />
          </FormSection>
        </Form>
      </NavigationContext.Provider>,
    );
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: PlatformColor('systemGroupedBackground'),
      },
    });

    await screen.unmount();
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      headerShadowVisible: undefined,
      headerStyle: undefined,
    });
  });

  it('leaves the iOS 26 header to the stack, where it is glass', async () => {
    jest.spyOn(DeviceInfo, 'hasLiquidGlass').mockReturnValue(true);
    const navigation = { setOptions: jest.fn() };
    await render(
      <NavigationContext.Provider value={navigation as never}>
        <Form>
          <FormSection>
            <FormText title="Row" />
          </FormSection>
        </Form>
      </NavigationContext.Provider>,
    );
    expect(navigation.setOptions).not.toHaveBeenCalled();
  });

  it('shows an overline above the title and its subtitle', async () => {
    await render(
      <Form>
        <FormSection>
          <FormText
            overline="Now · Ends in an hour"
            title="Linear Algebra"
            subtitle="09:50–11:25"
            progress={0.5}
          />
          <FormLink overline="Next" title="Physics" onPress={jest.fn()} />
        </FormSection>
      </Form>,
    );
    expect(screen.getByText('Now · Ends in an hour')).toBeOnTheScreen();
    expect(screen.getByText('Linear Algebra')).toBeOnTheScreen();
    expect(screen.getByText('09:50–11:25')).toBeOnTheScreen();
    expect(screen.getByText('Next')).toBeOnTheScreen();
    expect(screen.getByText('Physics')).toBeOnTheScreen();
  });

  it("sets an item's title in medium weight, and other rows' in regular", async () => {
    await render(
      <FormSection>
        <FormText item title="Linear Algebra" subtitle="09:50–11:25" />
        <FormLink item title="Essay" onPress={jest.fn()} />
      </FormSection>,
    );
    const medium = font({ textStyle: 'body', weight: 'medium' });
    const regular = font({ textStyle: 'body' });
    for (const title of ['Linear Algebra', 'Essay']) {
      expect(screen.getByText(title).props.modifiers[0]).toEqual(medium);
    }
    // At the default text size, with each detail at the row's end
    setFontScale(1);
    await render(
      <FormSection>
        <FormText title="Schedule" detail="4 classes" />
        <FormLink title="Settings" detail="New" onPress={jest.fn()} />
      </FormSection>,
    );
    // Titles and details in body, set on each (`bodyFont`)
    for (const text of ['Schedule', '4 classes', 'Settings', 'New']) {
      expect(screen.getByText(text).props.modifiers[0]).toEqual(regular);
    }
  });

  it('ends the last section clear of the window edge on Mac, as on iOS', async () => {
    for (const isMac of [false, true]) {
      jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(isMac);
      await render(
        <Form>
          <FormSection footer="First">
            <FormText title="Row" />
          </FormSection>
          <FormSection footer="Last">
            <FormText title="Row" />
          </FormSection>
        </Form>,
      );
      const [first, last] = screen.getAllByTestId('section');
      const margin = listSectionMargins({ edges: 'bottom', length: 24 });
      expect(last.props.modifiers).toContainEqual(margin);
      expect(first.props.modifiers).not.toContainEqual(margin);
    }
  });

  it('leaves the Mac header alone', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    const navigation = { setOptions: jest.fn() };
    await render(
      <NavigationContext.Provider value={navigation as never}>
        <Form>
          <FormSection>
            <FormText title="Row" />
          </FormSection>
        </Form>
      </NavigationContext.Provider>,
    );
    expect(navigation.setOptions).not.toHaveBeenCalled();
  });

  it('sets a grade large and bold, and a deadline semibold in its text shade', async () => {
    // At Jest's font scale of 2 the detail would go under the title instead.
    setFontScale(1);
    await render(
      <FormSection>
        <FormText title="Grade" detail="A" detailTint="accent" />
        <FormText title="Due" detail="Tomorrow" detailTint="orange" />
        <FormLink
          title="Essay"
          detail="due in 3 hours"
          detailTint="red"
          onPress={jest.fn()}
        />
      </FormSection>,
    );
    expect(font).toHaveBeenCalledWith({ textStyle: 'title3', weight: 'bold' });
    expect(font).toHaveBeenCalledWith({
      textStyle: 'body',
      weight: 'semibold',
    });
    // The hue's shade for text, which keeps 4.5:1 in light mode
    const { onStatusContainer } = BrandLightTheme.colors;
    expect(foregroundStyle).toHaveBeenCalledWith(onStatusContainer.orange);
    expect(foregroundStyle).toHaveBeenCalledWith(onStatusContainer.red);
  });

  it('shows a spinner in a button row while it works', async () => {
    await render(
      <FormSection>
        <FormButton title="Sync" loading onPress={jest.fn()} />
      </FormSection>,
    );
    expect(screen.getByTestId('progress')).toBeTruthy();
  });

  it('draws a smaller account row on the Mac, and a title without a subtitle', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    await render(
      <FormSection>
        <FormProfile name="Rui" />
        <FormTitle title="Problem set" />
        <FormTextField value="" onChangeText={jest.fn()} multiline />
      </FormSection>,
    );
    // The name in Title 2, which the Mac draws at its own smaller size
    expect(font).toHaveBeenCalledWith({
      textStyle: 'title2',
      weight: 'semibold',
    });
    expect(screen.getByText('Problem set')).toBeTruthy();
  });
});
