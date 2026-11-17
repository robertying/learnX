import { createRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import {
  BottomSheet,
  Button,
  Circle,
  ConfirmationDialog,
  createNativeState,
  DatePicker,
  Divider,
  Form,
  HStack,
  Host,
  Image,
  Label,
  LabeledContent,
  Link,
  NavigationStack,
  Picker,
  ProgressView,
  readModifiers,
  RNHostView,
  SecureField,
  Section,
  Spacer,
  symbolGlyph,
  Text,
  TextField,
  Toggle,
  Toolbar,
  ToolbarItem,
  useNativeState,
  VStack,
  ZStack,
  type SecureFieldRef,
} from 'web/packages/swiftUI';
import { ToastBackground, ToastSymbol } from 'web/toast';

// The stand-in modifiers, untyped: they record whatever they're given.
type ModifierFactory = ((...args: unknown[]) => unknown) &
  Record<string, (...args: unknown[]) => unknown>;
const {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  disabled,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  onSubmit,
  opacity,
  padding,
  shapes,
  strikethrough,
  tag,
} = require('../packages/swiftUIModifiers') as Record<string, ModifierFactory>;

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-symbols/androidWeights/regular', () => ({
  __esModule: true,
  default: { name: 'MaterialSymbols_400Regular', font: 1 },
}));

type Modifiers = Parameters<typeof readModifiers>[0];
const m = (...modifiers: unknown[]) => modifiers as Modifiers;

describe('readModifiers', () => {
  it('reads layout, color, font and behavior', () => {
    const submit = jest.fn();
    const read = readModifiers(
      m(
        padding({ horizontal: 16, vertical: 14, leading: 2 }),
        frame({ width: 40, height: 20, maxWidth: Infinity }),
        foregroundStyle('red'),
        background('blue'),
        font({ size: 20, weight: 'semibold' }),
        opacity(0.5),
        disabled(true),
        lineLimit(1),
        strikethrough({ isActive: true, pattern: 'solid' }),
        onSubmit(submit),
        accessibilityLabel('Name'),
        clipShape('roundedRectangle', 12),
        buttonStyle('borderedProminent'),
        labelStyle('iconOnly'),
        tag(3),
        shapes.rectangle(),
      ),
    );
    expect(read).toEqual({
      style: expect.objectContaining({
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingLeft: 2,
        width: 40,
        height: 20,
        alignSelf: 'stretch',
        backgroundColor: 'blue',
        opacity: 0.5,
        overflow: 'hidden',
        borderRadius: 12,
      }),
      textStyle: {
        color: 'red',
        fontSize: 20,
        fontWeight: '600',
        textDecorationLine: 'line-through',
      },
      disabled: true,
      lineLimit: 1,
      onSubmit: submit,
      accessibilityLabel: 'Name',
      buttonStyle: 'borderedProminent',
      iconOnly: true,
      tag: 3,
    });
  });

  it('reads the other shapes of padding, font and clip', () => {
    expect(readModifiers(m(padding(4))).style.padding).toBe(4);
    expect(readModifiers(m(padding())).style.padding).toBe(8);
    expect(readModifiers(m(font({ textStyle: 'headline' }))).textStyle).toEqual(
      { fontSize: 15, fontWeight: '600' },
    );
    expect(readModifiers(m(font({ textStyle: 'unknown' }))).textStyle).toEqual(
      {},
    );
    expect(readModifiers(m(font())).textStyle).toEqual({});
    expect(readModifiers(m(clipShape('circle'))).style.borderRadius).toBe(9999);
    expect(
      readModifiers(m(clipShape('roundedRectangle'))).style.borderRadius,
    ).toBe(8);
    expect(readModifiers(m(frame())).style).toEqual({});
    expect(readModifiers(m(lineLimit({ min: 6 }))).lineLimit).toBeUndefined();
    expect(readModifiers(m(strikethrough({}))).textStyle).toEqual({});
    expect(
      readModifiers(m(foregroundStyle({ type: 'hierarchical' }))),
    ).toMatchObject({ textStyle: {} });
    expect(readModifiers(m(background({ type: 'material' }))).style).toEqual(
      {},
    );
    expect(readModifiers().disabled).toBe(false);
  });
});

it('maps SF Symbols to Material Symbols', () => {
  expect(symbolGlyph('bell')).toBe(String.fromCharCode(0xe7f4));
  expect(symbolGlyph('chevron.right')).toBe(String.fromCharCode(0xe5cc));
  expect(symbolGlyph('no.such.symbol')).toBe('');
});

it('lays out stacks, text and images', async () => {
  await render(
    <Host seedColor="purple" testID="host" style={{ width: 300 }}>
      <VStack
        testID="v"
        alignment="leading"
        modifiers={m(foregroundStyle('green'))}
      >
        <HStack testID="h" spacing={4} alignment="top">
          <Text modifiers={m(lineLimit(1))}>inherited</Text>
          <Spacer />
          <Divider />
          <Image systemName="bell" testID="bell" />
          <Image systemName="bell" size={30} color="orange" testID="big" />
        </HStack>
        <Divider />
        <ZStack testID="z">
          <Circle modifiers={m(foregroundStyle('red'))} />
          <Text>over</Text>
        </ZStack>
        <Label title="labelled" systemImage="bell" />
        <Label>
          <Text>custom label</Text>
        </Label>
        <RNHostView>
          <Text>react native</Text>
        </RNHostView>
        <Link destination="learnx://x">
          <Text>link</Text>
        </Link>
      </VStack>
    </Host>,
  );
  expect(screen.getByText('inherited')).toHaveStyle({ color: 'green' });
  expect(screen.getByTestId('v')).toHaveStyle({ alignItems: 'flex-start' });
  expect(screen.getByTestId('h')).toHaveStyle({
    gap: 4,
    alignItems: 'flex-start',
  });
  expect(
    screen.getByTestId('bell', { includeHiddenElements: true }),
  ).toHaveTextContent(String.fromCharCode(0xe7f4));
  expect(
    screen.getByTestId('big', { includeHiddenElements: true }),
  ).toHaveStyle({
    fontSize: 30,
    color: 'orange',
  });
  expect(screen.getByText('over')).toBeTruthy();
  expect(screen.getByText('labelled')).toBeTruthy();
  expect(screen.getByText('custom label')).toBeTruthy();
  expect(screen.getByText('react native')).toBeTruthy();
  expect(screen.getByText('link')).toBeTruthy();
});

describe('Button', () => {
  it('presses, with its label in the tint', async () => {
    const onPress = jest.fn();
    await render(
      <Host seedColor="purple">
        <Button label="Save" onPress={onPress} testID="save" />
      </Host>,
    );
    expect(screen.getByText('Save')).toHaveStyle({ color: 'purple' });
    await userEvent.press(screen.getByTestId('save'));
    expect(onPress).toHaveBeenCalled();
  });

  it('draws the filled, bordered, destructive and icon-only styles', async () => {
    await render(
      <>
        <Button
          label="Filled"
          testID="filled"
          modifiers={m(buttonStyle('glassProminent'))}
        />
        <Button
          label="Bordered"
          testID="bordered"
          modifiers={m(buttonStyle('bordered'))}
        />
        <Button label="Delete" role="destructive" />
        <Button
          label="Search"
          systemImage="magnifyingglass"
          testID="icon"
          modifiers={m(labelStyle('iconOnly'), disabled(true))}
        />
        <Button testID="row">
          <Text>row text</Text>
        </Button>
      </>,
    );
    expect(screen.getByTestId('filled')).toHaveStyle({ borderRadius: 4 });
    expect(screen.getByTestId('bordered')).toHaveStyle({ borderRadius: 4 });
    expect(screen.queryByText('Search')).toBeNull();
    expect(screen.getByTestId('icon')).toBeDisabled();
    expect(screen.getByTestId('icon')).toHaveAccessibleName('Search');
    expect(screen.getByText('row text')).toBeTruthy();
  });
});

it('shows progress as a bar or a spinner', async () => {
  await render(
    <>
      <ProgressView value={0.25} testID="bar">
        <Text>25%</Text>
      </ProgressView>
      <ProgressView testID="spinner" />
    </>,
  );
  expect(screen.getByTestId('bar')).toBeTruthy();
  expect(screen.getByText('25%')).toBeTruthy();
  expect(screen.getByTestId('spinner')).toBeTruthy();
});

it('draws a form of sections and rows', async () => {
  await render(
    <Form testID="form">
      <Section title="Account" footer={<Text>footer</Text>}>
        <LabeledContent label="Name">
          <Text>Siyuan</Text>
        </LabeledContent>
        <>
          <LabeledContent label={<Text>custom</Text>} testID="custom" />
          <Text>second in fragment</Text>
        </>
      </Section>
      <Section header={<Text>header</Text>} />
    </Form>,
  );
  expect(screen.getByText('Account')).toBeTruthy();
  expect(screen.getByText('Name')).toBeTruthy();
  expect(screen.getByText('Siyuan')).toBeTruthy();
  expect(screen.getByText('custom')).toBeTruthy();
  expect(screen.getByText('footer')).toBeTruthy();
  expect(screen.getByText('header')).toBeTruthy();
});

describe('text fields', () => {
  it('write to and follow their native state', async () => {
    const state = createNativeState('a');
    const onChange = jest.fn();
    state.onChange = onChange;
    const submit = jest.fn();
    await render(
      <TextField
        text={state}
        placeholder="Name"
        testID="field"
        modifiers={m(onSubmit(submit), accessibilityLabel('Name'))}
      />,
    );
    const field = screen.getByTestId('field');
    expect(field).toHaveDisplayValue('a');
    await fireEvent.changeText(field, 'ab');
    expect(state.get()).toBe('ab');
    expect(onChange).toHaveBeenCalledWith('ab');
    await act(() => state.set('from js'));
    expect(field).toHaveDisplayValue('from js');
    await fireEvent(field, 'submitEditing');
    expect(submit).toHaveBeenCalled();
  });

  it('focuses a secure field through its ref', async () => {
    const ref = createRef<SecureFieldRef>();
    const Fields = () => {
      const text = useNativeState('');
      return <SecureField ref={ref} text={text} testID="password" />;
    };
    await render(<Fields />);
    await act(() => ref.current!.focus());
    await act(() => ref.current!.blur());
    await fireEvent.changeText(screen.getByTestId('password'), 'secret');
    expect(screen.getByTestId('password')).toHaveDisplayValue('secret');
  });
});

it('toggles', async () => {
  const onChange = jest.fn();
  await render(
    <>
      <Toggle
        isOn={false}
        onIsOnChange={onChange}
        label="Graduate"
        testID="t"
      />
      <Toggle isOn testID="t2">
        <Text>custom toggle</Text>
      </Toggle>
    </>,
  );
  expect(screen.getByText('Graduate')).toBeTruthy();
  expect(screen.getByText('custom toggle')).toBeTruthy();
  await fireEvent(screen.getByTestId('t'), 'valueChange', true);
  expect(onChange).toHaveBeenCalledWith(true);
});

it('picks one of its tagged options', async () => {
  const onSelect = jest.fn();
  await render(
    <Picker label="Scope" selection={1} onSelectionChange={onSelect}>
      <Text modifiers={m(tag(0))}>All</Text>
      <Text modifiers={m(tag(1))}>Unread</Text>
      <Text>Untagged</Text>
      {null}
    </Picker>,
  );
  expect(screen.getByRole('tab', { name: 'Unread' })).toBeSelected();
  await userEvent.press(screen.getByText('All'));
  expect(onSelect).toHaveBeenCalledWith(0);
  await userEvent.press(screen.getByText('Untagged'));
  expect(onSelect).toHaveBeenLastCalledWith(2);
});

it('picks a date, not before the range', async () => {
  const onChange = jest.fn();
  await render(
    <DatePicker
      title="End"
      testID="date"
      selection={new Date(2026, 10, 16)}
      range={{ start: new Date(2026, 10, 10) }}
      onDateChange={onChange}
    />,
  );
  const field = screen.getByTestId('date');
  expect(field).toHaveDisplayValue('2026-11-16');
  await fireEvent.changeText(field, '2026-11-20');
  expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 20));
  await fireEvent.changeText(field, '2026-11-01');
  await fireEvent.changeText(field, 'not a date');
  expect(onChange).toHaveBeenCalledTimes(1);
});

it('presents a sheet with a toolbar', async () => {
  const onChange = jest.fn();
  const { rerender } = await render(
    <BottomSheet isPresented onIsPresentedChange={onChange}>
      <NavigationStack>
        <Toolbar modifiers={m({ $type: 'navigationTitle', $args: ['Dates'] })}>
          <Text>sheet body</Text>
          <Toolbar.Content>
            <ToolbarItem>
              <Button label="Cancel" />
            </ToolbarItem>
          </Toolbar.Content>
        </Toolbar>
      </NavigationStack>
    </BottomSheet>,
  );
  expect(screen.getByText('Dates')).toBeTruthy();
  expect(screen.getByText('sheet body')).toBeTruthy();
  await userEvent.press(screen.getAllByLabelText('Cancel')[0]);
  expect(onChange).toHaveBeenCalledWith(false);

  await rerender(
    <BottomSheet isPresented={false}>
      <Toolbar>
        <Text>sheet body</Text>
      </Toolbar>
    </BottomSheet>,
  );
  expect(screen.queryByText('sheet body')).toBeNull();
});

it('asks to confirm a choice', async () => {
  const onChange = jest.fn();
  const onArchive = jest.fn();
  const { rerender } = await render(
    <ConfirmationDialog
      title="Archive?"
      isPresented
      onIsPresentedChange={onChange}
    >
      <ConfirmationDialog.Trigger>
        <Text>trigger</Text>
      </ConfirmationDialog.Trigger>
      <ConfirmationDialog.Actions>
        <Button label="Archive" onPress={onArchive} />
        {'not an action'}
      </ConfirmationDialog.Actions>
      <ConfirmationDialog.Message>
        <Text>message</Text>
      </ConfirmationDialog.Message>
    </ConfirmationDialog>,
  );
  expect(screen.getByText('trigger')).toBeTruthy();
  expect(screen.getByText('Archive?')).toBeTruthy();
  expect(screen.getByText('message')).toBeTruthy();
  await userEvent.press(screen.getByText('Archive'));
  expect(onArchive).toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledWith(false);

  await rerender(
    <ConfirmationDialog isPresented>
      <ConfirmationDialog.Actions>
        <Button label="Plain" />
      </ConfirmationDialog.Actions>
    </ConfirmationDialog>,
  );
  await userEvent.press(screen.getByText('Plain'));
  await userEvent.press(screen.getAllByText('Cancel')[0]);
});

it("draws the toast's backdrop and symbol", async () => {
  const { rerender } = await render(
    <ToastBackground cornerRadius={12} visible testID="toast">
      <ToastSymbol name="checkmark" size={20} color="white" />
    </ToastBackground>,
  );
  expect(screen.getByTestId('toast')).toHaveStyle({
    borderRadius: 12,
    opacity: 1,
  });
  await rerender(
    <ToastBackground cornerRadius={12} visible={false} testID="toast" />,
  );
  expect(screen.getByTestId('toast')).toHaveStyle({ opacity: 0 });
  expect(
    StyleSheet.flatten(screen.getByTestId('toast').props.style),
  ).toBeTruthy();
});
