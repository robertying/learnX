import { View } from 'react-native';
import { Switch as FluentSwitch } from '@fluentui/react-components';
import type { SwitchProps } from './Switch';

export type { SwitchProps } from './Switch';

/** Fluent's toggle switch, in the accent color when on. */
const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
  style,
}) => (
  <View style={style}>
    <FluentSwitch
      checked={value}
      disabled={disabled}
      aria-label={accessibilityLabel}
      data-testid={testID}
      onChange={(_event, data) => onValueChange(data.checked)}
    />
  </View>
);

export default Switch;
