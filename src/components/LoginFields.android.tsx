import { useState } from 'react';
import {
  Column,
  OutlinedTextField,
  Text,
  useNativeState,
  type TextFieldRef,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  semantics,
  testID,
} from '@expo/ui/jetpack-compose/modifiers';
import { useFieldText } from 'hooks/useFieldText';
import ThemedHost from 'components/ThemedHost';
import { trim, type LoginFieldsProps } from './LoginFields.shared';

export type { LoginFieldsProps } from './LoginFields.shared';

// Account names and passwords: no capitals or corrections.
const keyboardOptions = {
  capitalization: 'none',
  autoCorrectEnabled: false,
} as const;

/**
 * The account and password as Material outlined fields, each named in its
 * outline, with the content types that Autofill reads.
 */
const LoginFields: React.FC<LoginFieldsProps> = ({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  usernameLabel,
  passwordLabel,
  style,
}) => {
  const usernameText = useNativeState(username);
  useFieldText(usernameText, {
    value: username,
    onChangeText: onUsernameChange,
    format: trim,
  });
  const passwordText = useNativeState(password);
  useFieldText(passwordText, {
    value: password,
    onChangeText: onPasswordChange,
    format: trim,
  });

  // Next on the account moves to the password.
  const [passwordField, setPasswordField] = useState<TextFieldRef | null>(null);
  const focusPassword = () => {
    void passwordField?.focus();
  };

  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <Column verticalArrangement={{ spacedBy: 12 }}>
        <OutlinedTextField
          value={usernameText}
          singleLine
          keyboardOptions={{
            ...keyboardOptions,
            keyboardType: 'ascii',
            imeAction: 'next',
          }}
          keyboardActions={{ onNext: focusPassword }}
          modifiers={[
            fillMaxWidth(),
            semantics({ contentType: 'username' }),
            testID('login-username'),
          ]}
        >
          <OutlinedTextField.Label>
            <Text>{usernameLabel}</Text>
          </OutlinedTextField.Label>
        </OutlinedTextField>
        <OutlinedTextField
          ref={setPasswordField}
          value={passwordText}
          singleLine
          visualTransformation="password"
          keyboardOptions={{
            ...keyboardOptions,
            keyboardType: 'password',
            imeAction: 'done',
          }}
          keyboardActions={{ onDone: onSubmit }}
          modifiers={[
            fillMaxWidth(),
            semantics({ contentType: 'password' }),
            testID('login-password'),
          ]}
        >
          <OutlinedTextField.Label>
            <Text>{passwordLabel}</Text>
          </OutlinedTextField.Label>
        </OutlinedTextField>
      </Column>
    </ThemedHost>
  );
};

export default LoginFields;
