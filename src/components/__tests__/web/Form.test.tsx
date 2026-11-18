import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  Form,
  FormButton,
  FormChoiceButton,
  FormFile,
  FormLink,
  FormNumberField,
  FormParagraph,
  FormProfile,
  FormScreen,
  FormSection,
  FormText,
  FormTextField,
  FormTitle,
  FormToggle,
  FormView,
} from 'components/Form';
import { t } from 'helpers/i18n';
import { Menus } from 'modules/menus';
import FluentRoot from 'web/FluentRoot';

const renderForm = (children: React.ReactNode) =>
  render(<FluentRoot>{children}</FluentRoot>);

it('lays out sections of rows with their titles and footers', () => {
  renderForm(
    <Form testID="form">
      <FormSection title="Account" footer="About the account">
        <FormText title="Name" detail="Rui" icon="person" />
        {false}
        <>
          <FormText title="Grade" detail="A" detailTint="accent" />
        </>
      </FormSection>
    </Form>,
  );
  expect(screen.getByRole('heading', { name: 'Account' })).toBeTruthy();
  expect(screen.getByText('About the account')).toBeTruthy();
  expect(screen.getByText('Rui')).toBeTruthy();
  expect(screen.getByText('A')).toBeTruthy();
});

it('shows a text row done, with a progress bar and an action', () => {
  const onPress = jest.fn();
  renderForm(
    <FormText
      title="Lecture"
      overline="Now"
      subtitle="Room 101"
      detail="Due soon"
      detailTint="red"
      progress={0.5}
      done
      action={{ title: 'Log In', onPress, testID: 'action' }}
    />,
  );
  fireEvent.click(screen.getByTestId('action'));
  expect(onPress).toHaveBeenCalled();
  expect(screen.getByRole('progressbar')).toBeTruthy();
  expect(screen.getByText('Now')).toBeTruthy();
  expect(screen.getByLabelText(t('a11yDone'))).toBeTruthy();
});

it('keeps a status on one line, so the label wraps instead', () => {
  renderForm(
    <FormLink
      item
      title="Assignment"
      detail="Due in 1 day"
      detailTint="red"
      onPress={jest.fn()}
    />,
  );
  const status = getComputedStyle(screen.getByText('Due in 1 day'));
  expect(status.whiteSpace).toBe('nowrap');
  expect(status.flexShrink).toBe('0');
});

it('opens a link row and shows its badge', () => {
  const onPress = jest.fn();
  renderForm(
    <FormLink title="Sharing" badge onPress={onPress} testID="link" />,
  );
  expect(screen.getByLabelText(t('a11yNewBadge'))).toBeTruthy();
  fireEvent.click(screen.getByTestId('link'));
  expect(onPress).toHaveBeenCalled();
});

it('runs a button row unless it is disabled or loading', () => {
  const onPress = jest.fn();
  const { rerender } = renderForm(
    <FormButton title="Delete" destructive onPress={onPress} testID="row" />,
  );
  fireEvent.click(screen.getByTestId('row'));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(
    <FluentRoot>
      <FormButton title="Delete" loading onPress={onPress} testID="row" />
    </FluentRoot>,
  );
  fireEvent.click(screen.getByTestId('row'));
  rerender(
    <FluentRoot>
      <FormButton title="Delete" disabled onPress={onPress} testID="row" />
    </FluentRoot>,
  );
  fireEvent.click(screen.getByTestId('row'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('marks the chosen row of a choice list', () => {
  renderForm(
    <>
      <FormButton title="One" selected onPress={() => {}} />
      <FormButton title="Two" selected={false} onPress={() => {}} />
    </>,
  );
  const [one, two] = screen.getAllByRole('radio');
  expect(one.getAttribute('aria-checked')).toBe('true');
  expect(two.getAttribute('aria-checked')).toBe('false');
});

it('asks with a menu under the row and reports a dismissal', async () => {
  const keep = jest.fn();
  const onCancel = jest.fn();
  renderForm(
    <FormChoiceButton
      title="Semester"
      testID="choice"
      sheet={{
        title: 'Switch?',
        choices: [{ label: 'Keep', onPress: keep }],
        onCancel,
      }}
    />,
  );
  fireEvent.click(screen.getByTestId('choice'));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Keep' }));
  expect(keep).toHaveBeenCalled();
  await act(() => new Promise(resolve => setTimeout(resolve)));
  expect(onCancel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByTestId('choice'));
  await screen.findByRole('menuitem', { name: 'Keep' });
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await act(() => new Promise(resolve => setTimeout(resolve)));
  expect(onCancel).toHaveBeenCalled();
});

it('opens a file row, crossed out while it is replaced', () => {
  const onPress = jest.fn();
  renderForm(<FormFile title="a.pdf" struck onPress={onPress} testID="file" />);
  fireEvent.click(screen.getByTestId('file'));
  expect(onPress).toHaveBeenCalled();
});

it('keeps typed text and takes a new value from outside', () => {
  const onChangeText = jest.fn();
  const { rerender } = renderForm(
    <FormTextField
      value=""
      onChangeText={onChangeText}
      format={text => text.toUpperCase()}
      placeholder="Name"
      plain
    />,
  );
  const input = screen.getByLabelText('Name') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'abc' } });
  expect(onChangeText).toHaveBeenCalledWith('ABC');
  expect(input.value).toBe('ABC');
  const field = (value: string) => (
    <FluentRoot>
      <FormTextField
        value={value}
        onChangeText={onChangeText}
        placeholder="Name"
        plain
      />
    </FluentRoot>
  );
  // The echo of what was typed, then a cleared draft
  rerender(field('ABC'));
  expect(input.value).toBe('ABC');
  rerender(field(''));
  expect(input.value).toBe('');
});

it('writes several lines in a text area', () => {
  const onChangeText = jest.fn();
  renderForm(
    <FormTextField
      value="Draft"
      onChangeText={onChangeText}
      label="Comment"
      multiline
    />,
  );
  const area = screen.getByLabelText('Comment');
  expect(area.tagName).toBe('TEXTAREA');
  fireEvent.change(area, { target: { value: 'Draft 2' } });
  expect(onChangeText).toHaveBeenCalledWith('Draft 2');
});

it('switches a toggle row, or shows a spinner while loading', () => {
  const onValueChange = jest.fn();
  const { rerender } = renderForm(
    <FormToggle title="Notify" value={false} onValueChange={onValueChange} />,
  );
  expect(screen.getByText(t('off'))).toBeTruthy();
  fireEvent.click(screen.getByRole('switch', { name: 'Notify' }));
  expect(onValueChange).toHaveBeenCalledWith(true);
  rerender(
    <FluentRoot>
      <FormToggle title="Notify" value loading onValueChange={() => {}} />
    </FluentRoot>,
  );
  expect(screen.queryByRole('switch')).toBeNull();
});

it('takes whole positive numbers in a number row', () => {
  const onValueChange = jest.fn();
  renderForm(
    <FormNumberField
      title="Minutes"
      value={15}
      onValueChange={onValueChange}
    />,
  );
  const input = screen.getByRole('spinbutton', { name: 'Minutes' });
  fireEvent.change(input, { target: { value: '30' } });
  fireEvent.blur(input);
  expect(onValueChange).toHaveBeenCalledWith(30);
});

it('shows paragraphs, titles, views and the profile', () => {
  renderForm(
    <FormScreen>
      <FormTitle title="Homework" subtitle="Due Friday" />
      <FormParagraph text="Some text" />
      <FormParagraph text="A name" headline />
      <FormView loading>
        <span>Body</span>
      </FormView>
      <FormProfile name="Rui" detail="EE" />
    </FormScreen>,
  );
  for (const text of [
    'Homework',
    'Due Friday',
    'Some text',
    'A name',
    'Body',
    'Rui',
    'EE',
  ]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
});

it('refreshes on the refresh shortcut, once at a time', async () => {
  let finish = () => {};
  const onRefresh = jest.fn(
    () => new Promise<void>(resolve => (finish = resolve)),
  );
  renderForm(<Form onRefresh={onRefresh} />);
  fireEvent.keyDown(window, { key: 'F5' });
  fireEvent.keyDown(window, { key: 'F5' });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
  expect(onRefresh).toHaveBeenCalledTimes(2);
  expect(Menus).toBeDefined();
});
