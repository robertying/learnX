import { StyleProp, ViewStyle } from 'react-native';
import { Host, Switch as NativeSwitch } from '@expo/ui';
import { useTheme } from 'theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** The system switch (SwiftUI `Toggle`, Material 3 `Switch`), tinted with the primary color. */
const Switch: React.FC<SwitchProps> = ({ style, ...props }) => {
  const theme = useTheme();

  return (
    <Host matchContents seedColor={theme.colors.primary} style={style}>
      <NativeSwitch {...props} />
    </Host>
  );
};

export default Switch;
