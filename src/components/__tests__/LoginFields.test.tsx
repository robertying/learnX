import { fireEvent, render, screen } from '@testing-library/react-native';
import { submitLabel, textContentType } from '@expo/ui/swift-ui/modifiers';
import LoginFields from 'components/LoginFields';

const setup = async (
  props: Partial<React.ComponentProps<typeof LoginFields>> = {},
) => {
  const handlers = {
    onUsernameChange: jest.fn(),
    onPasswordChange: jest.fn(),
    onSubmit: jest.fn(),
  };
  await render(
    <LoginFields
      username="student"
      password=""
      usernameLabel="Username"
      passwordLabel="Password"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('LoginFields (iOS)', () => {
  it('names the fields and marks them for password AutoFill', async () => {
    await setup();
    const username = screen.getByLabelText('Username');
    const password = screen.getByLabelText('Password');
    expect(username).toBe(screen.getByTestId('login-username'));
    expect(username.props.value).toBe('student');
    expect(username.props.secureTextEntry).toBeFalsy();
    expect(password.props.secureTextEntry).toBe(true);
    expect(textContentType).toHaveBeenCalledWith('username');
    expect(textContentType).toHaveBeenCalledWith('password');
    expect(submitLabel).toHaveBeenCalledWith('next');
    expect(submitLabel).toHaveBeenCalledWith('done');
  });

  it('trims what is typed, moves on with Next and submits with Done', async () => {
    const { onUsernameChange, onPasswordChange, onSubmit } = await setup();
    const username = screen.getByTestId('login-username');
    const password = screen.getByTestId('login-password');
    await fireEvent.changeText(username, ' teacher ');
    expect(onUsernameChange).toHaveBeenLastCalledWith('teacher');
    await fireEvent.changeText(password, 'secret ');
    expect(onPasswordChange).toHaveBeenLastCalledWith('secret');

    await fireEvent(username, 'submitEditing');
    expect(password.props.focus).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    await fireEvent(password, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
