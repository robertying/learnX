import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import {
  Form,
  FormButton,
  FormLink,
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
            icon={{ ios: 'calendar.circle', android: 'calendar' }}
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
});
