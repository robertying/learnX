import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  FormButton,
  FormChoiceButton,
  FormLink,
  FormNumberField,
  FormProfile,
  FormSection,
  FormText,
  FormTitle,
  FormToggle,
  FormView,
} from 'components/Form';
import { t } from 'helpers/i18n';
import FluentRoot from 'web/FluentRoot';

// The Form's other states: rows without their optional parts, the pointer
// over a row.

const renderForm = (children: React.ReactNode) =>
  render(<FluentRoot>{children}</FluentRoot>);

it('draws rows without their optional parts', () => {
  renderForm(
    <>
      <FormSection footer="Hidden footer" footerHidden>
        {'not a row'}
        <FormText title="Plain" item detail="Soon" detailTint="orange" />
        <FormButton title="Off" icon="delete" disabled onPress={() => {}} />
        <FormButton title="Pick" icon="semester" onPress={() => {}} />
      </FormSection>
      <FormTitle title="Untitled" />
      <FormView>
        <span>Ready</span>
      </FormView>
      <FormProfile name="Rui" />
      <FormToggle title="Alarm" value onValueChange={() => {}} disabled />
    </>,
  );
  expect(screen.getByText('Hidden footer').getAttribute('aria-hidden')).toBe(
    'true',
  );
  expect(screen.queryByText('not a row')).toBeNull();
  expect(screen.getByText('Soon')).toBeTruthy();
  expect(screen.getByText(t('on'))).toBeTruthy();
  expect(screen.getByText('Ready')).toBeTruthy();
});

it('fills a row under the pointer, darker while pressed', () => {
  renderForm(<FormLink title="Open" onPress={() => {}} testID="row" />);
  const row = screen.getByTestId('row');
  const before = row.className;
  fireEvent.mouseOver(row);
  fireEvent.pointerOver(row);
  fireEvent.pointerDown(row, { button: 0, pointerType: 'mouse' });
  fireEvent.mouseDown(row);
  expect(row.className === before || row.getAttribute('style')).toBeTruthy();
  fireEvent.pointerUp(row, { button: 0, pointerType: 'mouse' });
});

it('colors a destructive choice red, and takes a number typed as text', async () => {
  const onValueChange = jest.fn();
  renderForm(
    <>
      <FormChoiceButton
        title="Draft"
        testID="choice"
        sheet={{
          title: 'Draft',
          choices: [{ label: 'Discard', onPress: () => {}, destructive: true }],
        }}
      />
      <FormNumberField title="Days" value={3} onValueChange={onValueChange} />
    </>,
  );
  fireEvent.click(screen.getByTestId('choice'));
  const discard = await screen.findByRole('menuitem', { name: 'Discard' });
  expect(discard.getAttribute('style')).toContain('color');
  fireEvent.keyDown(discard, { key: 'Escape' });
  await act(() => new Promise(resolve => setTimeout(resolve)));

  const input = screen.getByRole('spinbutton', { name: 'Days' });
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(onValueChange).toHaveBeenCalledWith(4);
});
