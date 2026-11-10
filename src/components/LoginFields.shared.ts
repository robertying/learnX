import type { StyleProp, ViewStyle } from 'react-native';

/** The login's account and password fields. */
export interface LoginFieldsProps {
  username: string;
  password: string;
  onUsernameChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  /** The password's return key. */
  onSubmit: () => void;
  usernameLabel: string;
  passwordLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Drops spaces typed or pasted around an account name or password. A worklet:
 * on iOS it runs on the UI thread as each key lands.
 */
export const trim = (text: string) => {
  'worklet';
  return text.trim();
};
