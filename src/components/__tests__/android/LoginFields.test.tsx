import { fireEvent, render, screen } from '@testing-library/react-native';
import LoginFields from 'components/LoginFields';

describe('LoginFields (Android)', () => {
  it('names the outlined fields and gives Autofill their content types', async () => {
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
      />,
    );
    expect(screen.getByText('Username')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    const username = screen.getByTestId('login-username');
    const password = screen.getByTestId('login-password');
    expect(username.props.value).toBe('student');
    expect(username.props.contentType).toBe('username');
    expect(username.props.secureTextEntry).toBe(false);
    expect(username.props.keyboardOptions).toMatchObject({
      keyboardType: 'ascii',
      imeAction: 'next',
    });
    expect(password.props.contentType).toBe('password');
    expect(password.props.secureTextEntry).toBe(true);
    expect(password.props.keyboardOptions).toMatchObject({
      keyboardType: 'password',
      imeAction: 'done',
    });

    await fireEvent.changeText(username, ' teacher ');
    expect(handlers.onUsernameChange).toHaveBeenLastCalledWith('teacher');
    await fireEvent.changeText(password, 'secret');
    expect(handlers.onPasswordChange).toHaveBeenLastCalledWith('secret');
    await fireEvent(username, 'submitEditing');
    expect(password.props.focus).toHaveBeenCalledTimes(1);
    await fireEvent(password, 'submitEditing');
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  });
});
