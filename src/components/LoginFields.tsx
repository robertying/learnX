import { useState } from 'react';
import { PlatformColor } from 'react-native';
import {
  Divider,
  SecureField,
  TextField,
  useNativeState,
  VStack,
  type SecureFieldRef,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  autocorrectionDisabled,
  background,
  clipShape,
  keyboardType,
  onSubmit,
  padding,
  submitLabel,
  textContentType,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { useFieldText } from 'hooks/useFieldText';
import ThemedHost from 'components/ThemedHost';
import { trim, type LoginFieldsProps } from './LoginFields.shared';

export type { LoginFieldsProps } from './LoginFields.shared';

// Account names and passwords: no capitals or corrections, ASCII keys.
const fieldModifiers = [
  padding({ horizontal: 16, vertical: 14 }),
  textInputAutocapitalization('never'),
  autocorrectionDisabled(true),
  keyboardType('ascii-capable'),
];
// One filled, rounded group, as in Apple's sign-in sheets.
const groupModifiers = [
  background(PlatformColor('tertiarySystemFill')),
  clipShape('roundedRectangle', 12),
];

/**
 * The account and password as system fields (SwiftUI `TextField` and
 * `SecureField`) in one view, with the content types that password AutoFill
 * reads: it fills both and offers to save them after a login.
 */
const LoginFields: React.FC<LoginFieldsProps> = ({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit: submit,
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
  const [passwordField, setPasswordField] = useState<SecureFieldRef | null>(
    null,
  );
  const focusPassword = () => {
    void passwordField?.focus();
  };

  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <VStack spacing={0} modifiers={groupModifiers}>
        <TextField
          text={usernameText}
          placeholder={usernameLabel}
          testID="login-username"
          modifiers={[
            ...fieldModifiers,
            textContentType('username'),
            submitLabel('next'),
            accessibilityLabel(usernameLabel),
            onSubmit(focusPassword),
          ]}
        />
        <Divider modifiers={[padding({ leading: 16 })]} />
        <SecureField
          ref={setPasswordField}
          text={passwordText}
          placeholder={passwordLabel}
          testID="login-password"
          modifiers={[
            ...fieldModifiers,
            textContentType('password'),
            submitLabel('done'),
            accessibilityLabel(passwordLabel),
            onSubmit(submit),
          ]}
        />
      </VStack>
    </ThemedHost>
  );
};

export default LoginFields;
