import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Field, Input } from '@fluentui/react-components';
import Spacing from 'constants/Spacing';
import { trim, type LoginFieldsProps } from './LoginFields.shared';

export type { LoginFieldsProps } from './LoginFields.shared';

/**
 * The account and password as Fluent text boxes with their labels above, as
 * a Windows sign-in form lays them out. Return in the account moves to the
 * password, and in the password submits. (There's no system password
 * manager to fill them: learnX keeps the login itself.)
 */
const LoginFields: React.FC<LoginFieldsProps> = ({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  usernameLabel,
  passwordLabel,
  disabled,
  style,
}) => {
  const passwordInput = useRef<HTMLInputElement>(null);
  return (
    <View style={[styles.fields, style]}>
      <Field label={usernameLabel}>
        <Input
          value={username}
          disabled={disabled}
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-testid="login-username"
          onChange={(_event, data) => onUsernameChange(trim(data.value))}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              passwordInput.current?.focus();
            }
          }}
        />
      </Field>
      <Field label={passwordLabel}>
        <Input
          ref={passwordInput}
          type="password"
          value={password}
          disabled={disabled}
          autoComplete="current-password"
          data-testid="login-password"
          onChange={(_event, data) => onPasswordChange(trim(data.value))}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              onSubmit();
            }
          }}
        />
      </Field>
    </View>
  );
};

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.m,
  },
});

export default LoginFields;
