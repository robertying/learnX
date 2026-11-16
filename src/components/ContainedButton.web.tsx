import { View } from 'react-native';
import { Button } from '@fluentui/react-components';
import type { ContainedButtonProps } from './ContainedButton.shared';

export type { ContainedButtonProps } from './ContainedButton.shared';

/** Fluent's primary (accent) button; `large` for the end of a welcome page. */
const ContainedButton: React.FC<ContainedButtonProps> = ({
  label,
  disabled,
  size = 'regular',
  onPress,
  style,
  testID,
}) => (
  <View style={[{ alignSelf: 'flex-start' }, style]}>
    <Button
      appearance="primary"
      size={size === 'large' ? 'large' : 'medium'}
      disabled={disabled}
      onClick={onPress}
      data-testid={testID}
      style={size === 'large' ? { minWidth: 120 } : undefined}
    >
      {label}
    </Button>
  </View>
);

export default ContainedButton;
