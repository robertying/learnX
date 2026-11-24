import { StyleSheet, View } from 'react-native';
import { Button, Spinner } from '@fluentui/react-components';
import type { ContainedButtonProps } from './ContainedButton.shared';

export type { ContainedButtonProps } from './ContainedButton.shared';

/**
 * Fluent's primary (accent) button; `large` for the end of a welcome page.
 * While loading, a tiny spinner is its icon, as in Fluent's loading button.
 */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  loading,
  size = 'regular',
  onPress,
  style,
  testID,
}) => (
  <View style={[styles.root, style]}>
    <Button
      appearance="primary"
      size={size === 'large' ? 'large' : 'medium'}
      disabled={disabled || loading}
      icon={loading ? <Spinner size="tiny" /> : undefined}
      onClick={onPress}
      data-testid={testID}
      style={size === 'large' ? { minWidth: 120 } : undefined}
    >
      {label}
    </Button>
  </View>
);

const styles = StyleSheet.create({
  // Holds the button at its own size wherever it's placed, without taking
  // the place itself (`alignSelf` would override a row's centering).
  root: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});

export default ContainedButton;
