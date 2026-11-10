import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { useState } from 'react';
import type * as ReactNative from 'react-native';
import { StyleSheet, Text } from 'react-native';
import {
  Form,
  FormButton,
  FormFile,
  FormLink,
  FormNumberField,
  FormParagraph,
  FormProfile,
  FormProgress,
  FormView,
  FormSection,
  FormText,
  FormTextField,
  FormTitle,
  FormToggle,
} from 'components/Form';

describe('Form (Android)', () => {
  it('opens a page from a link row, with its new-item badge', async () => {
    const onPress = jest.fn();
    await render(
      <Form>
        <FormSection title="Content" footer="Pick the semester to show">
          <FormLink
            title="Semester"
            icon="calendar"
            badge
            onPress={onPress}
            testID="semester"
          />
        </FormSection>
      </Form>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByText('Pick the semester to show')).toBeTruthy();
    expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    expect(screen.getByTestId('badge')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('semester'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('makes the whole toggle row the switch', async () => {
    const onValueChange = jest.fn();
    await render(
      <FormSection>
        <FormToggle
          title="Notifications"
          value={false}
          onValueChange={onValueChange}
          testID="notifications"
        />
      </FormSection>,
    );
    const row = screen.getByTestId('notifications');
    expect(row.props.accessibilityRole).toBe('switch');
    await userEvent.setup().press(row);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('marks the chosen row of a list as a selected radio button', async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormButton title="English" selected onPress={onPress} testID="en" />
        <FormButton
          title="中文" // oxlint-disable-line learnx/no-han-outside-translations -- test data
          selected={false}
          onPress={onPress}
          testID="zh"
        />
      </FormSection>,
    );
    expect(screen.getByTestId('en').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId('zh').props.accessibilityState).toMatchObject({
      selected: false,
    });
    await userEvent.setup().press(screen.getByTestId('zh'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("doesn't run a loading or disabled button", async () => {
    const onPress = jest.fn();
    await render(
      <FormSection>
        <FormButton title="Log out" loading onPress={onPress} testID="out" />
        <FormButton title="Sync" disabled onPress={onPress} testID="sync" />
      </FormSection>,
    );
    expect(screen.getByTestId('progress')).toBeTruthy();
    await userEvent.setup().press(screen.getByTestId('out'));
    await userEvent.setup().press(screen.getByText('Sync'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a detail, the title of a page and its subtitle', async () => {
    await render(
      <FormSection>
        <FormTitle title="Problem set 3" subtitle="Calculus" />
        <FormText title="Grade" detail="A" detailTint="accent" />
      </FormSection>,
    );
    expect(screen.getByText('Problem set 3')).toBeTruthy();
    expect(screen.getByText('Calculus')).toBeTruthy();
    expect(screen.getByText('Grade')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('keeps a text field and its value in step', async () => {
    const Field = () => {
      const [value, setValue] = useState('');
      return (
        <>
          <FormSection>
            <FormTextField
              value={value}
              onChangeText={setValue}
              placeholder="Notes"
              testID="notes"
            />
          </FormSection>
          <FormText title={`typed: ${value}`} />
        </>
      );
    };
    await render(<Field />);
    await userEvent.setup().type(screen.getByTestId('notes'), 'hi');
    expect(await screen.findByText('typed: hi')).toBeTruthy();
  });

  it('refreshes on a pull, showing the indicator until it settles', async () => {
    let finish = () => {};
    const onRefresh = jest.fn(
      () => new Promise<void>(resolve => (finish = resolve)),
    );
    await render(
      <Form onRefresh={onRefresh} testID="form">
        <FormSection>
          <FormText title="Row" />
        </FormSection>
      </Form>,
    );
    const box = screen.getByTestId('pull-to-refresh');
    expect(box.props.accessibilityState.busy).toBe(false);
    // Not awaited: the refresh is still running.
    await act(async () => {
      void box.props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(box.props.accessibilityState.busy).toBe(true);
    await act(async () => finish());
    expect(box.props.accessibilityState.busy).toBe(false);
  });

  it('shows a bar under a row in progress', async () => {
    await render(
      <FormSection>
        <FormText title="Downloading" progress={0.4} />
        <FormProgress title="Storage" value={0.25} />
      </FormSection>,
    );
    expect(
      screen
        .getAllByTestId('progress')
        .map(bar => bar.props.accessibilityValue.now),
    ).toEqual([40, 25]);
  });

  it('opens a file unless it is disabled', async () => {
    const open = jest.fn();
    const user = userEvent.setup();
    await render(
      <FormSection>
        <FormFile title="slides.pdf" onPress={open} testID="file" />
        <FormFile title="old.pdf" onPress={open} disabled testID="disabled" />
      </FormSection>,
    );
    await user.press(screen.getByTestId('disabled'));
    expect(open).not.toHaveBeenCalled();
    await user.press(screen.getByTestId('file'));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('takes only positive whole numbers in a number field', async () => {
    const onValueChange = jest.fn();
    await render(
      <FormSection>
        <FormNumberField
          title="Minutes before"
          value={60}
          onValueChange={onValueChange}
        />
      </FormSection>,
    );
    const field = screen.getByDisplayValue('60');
    await fireEvent.changeText(field, '0');
    await fireEvent.changeText(field, 'abc');
    expect(onValueChange).not.toHaveBeenCalled();
    await fireEvent.changeText(field, '30');
    expect(onValueChange).toHaveBeenCalledWith(30);
  });

  it('shows paragraphs, the profile and React Native views in rows', async () => {
    await render(
      <FormSection>
        <FormProfile name="Rui" detail="2020000000" />
        <FormParagraph text="Some notes" headline />
        <FormView>
          <Text>Embedded</Text>
        </FormView>
      </FormSection>,
    );
    for (const text of ['Rui', '2020000000', 'Some notes', 'Embedded']) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByTestId('icon-account')).toBeTruthy();
  });
  const style = (text: string) =>
    StyleSheet.flatten(screen.getByText(text).props.style);

  /** Jest's React Native reports a font scale of 2. */
  const atFontScale = (fontScale: number) =>
    jest
      .spyOn(
        require('react-native') as typeof ReactNative,
        'useWindowDimensions',
      )
      .mockReturnValue({ width: 400, height: 800, scale: 2, fontScale });
  afterEach(() => jest.restoreAllMocks());

  it('tints a detail by its kind, and grays out a row that is over', async () => {
    atFontScale(1);
    await render(
      <FormSection>
        <FormText title="Grade" detail="A" detailTint="accent" />
        <FormText title="Due" detail="Tomorrow" detailTint="warning" />
        <FormText title="Size" detail="2 MB" />
        <FormText title="Submitted" subtitle="On time" detail="Mon" done />
      </FormSection>,
    );
    expect(style('A').color).toBe('primary');
    expect(screen.getByText('A').props.typography).toBe('titleLarge');
    expect(style('Tomorrow').color).not.toMatch(/^[a-zA-Z]+$/);
    expect(screen.getByText('Tomorrow').props.typography).toBe('labelLarge');
    expect(style('2 MB').color).toBe('onSurfaceVariant');
    expect(screen.getByText('2 MB').props.typography).toBeUndefined();
    for (const text of ['Submitted', 'On time', 'Mon']) {
      expect(style(text).color).toBe('outline');
    }
    // read out as over, with no check drawn
    expect(screen.getByLabelText('Submitted, Ended')).toBeTruthy();
    expect(screen.queryByTestId('icon-check')).toBeNull();
  });

  it('puts the detail under the subtitle at large font sizes', async () => {
    atFontScale(1.5);
    await render(
      <FormSection>
        <FormText title="Deadline" subtitle="Problem set" detail="Friday" />
        <FormText title="Grade" detail="A" />
      </FormSection>,
    );
    expect(screen.getByText('Problem set\nFriday')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('colors a destructive button, and a disabled one over it', async () => {
    await render(
      <FormSection>
        <FormButton title="Log out" destructive onPress={jest.fn()} />
        <FormButton title="Erase" destructive disabled onPress={jest.fn()} />
        <FormButton title="Sync" onPress={jest.fn()} />
      </FormSection>,
    );
    expect(style('Log out').color).toBe('error');
    expect(style('Erase').color).toEqual(expect.any(String));
    expect(style('Erase').color).not.toBe('error');
    expect(style('Sync').color).toBeUndefined();
  });

  it('crosses out a removed file, which still opens', async () => {
    const open = jest.fn();
    await render(
      <FormSection>
        <FormFile title="old.pdf" struck onPress={open} testID="old" />
      </FormSection>,
    );
    expect(style('old.pdf')).toMatchObject({
      color: 'onSurfaceVariant',
      textDecorationLine: 'line-through',
    });
    await userEvent.setup().press(screen.getByTestId('old'));
    expect(open).toHaveBeenCalled();
  });

  it('writes several lines, or plain text without capitals or corrections', async () => {
    await render(
      <FormSection>
        <FormTextField value="" onChangeText={jest.fn()} multiline testID="a" />
        <FormTextField value="" onChangeText={jest.fn()} plain testID="b" />
      </FormSection>,
    );
    expect(screen.getByTestId('a').props).toMatchObject({
      multiline: true,
      autoCapitalize: 'sentences',
    });
    expect(screen.getByTestId('b').props).toMatchObject({
      multiline: false,
      autoCapitalize: 'none',
      autoCorrect: false,
    });
  });

  it('shows a spinner in place of a switch that is loading', async () => {
    const onValueChange = jest.fn();
    await render(
      <FormSection>
        <FormToggle
          title="Sync"
          value
          loading
          onValueChange={onValueChange}
          testID="sync"
        />
      </FormSection>,
    );
    expect(screen.getByTestId('progress')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    await userEvent.setup().press(screen.getByText('Sync'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('leaves out what a row, title, profile or section was not given', async () => {
    await render(
      <>
        <FormSection title="Empty" />
        <FormSection>
          <FormTitle title="Untitled" />
          <FormProfile name="Rui" />
          <FormParagraph text="Body" />
          <FormLink title="Plain link" onPress={jest.fn()} />
        </FormSection>
      </>,
    );
    expect(screen.getByText('Empty')).toBeTruthy();
    expect(screen.getByText('Body').props.typography).toBe('bodyLarge');
    expect(screen.queryByTestId('badge')).toBeNull();
    expect(screen.getByText('Untitled')).toBeTruthy();
  });
});
