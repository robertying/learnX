import { Platform, StyleProp, ViewStyle } from 'react-native';
import { Host, Switch as NativeSwitch } from '@expo/ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** What the switch controls, for VoiceOver / TalkBack. Not shown. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

// SwiftUI reads a hidden label to VoiceOver (a checkbox on Mac Catalyst).
const iosModifiers = [labelsHidden()];

/** The system switch (SwiftUI `Toggle`, Material 3 `Switch`), tinted with the primary color. */
const Switch: React.FC<SwitchProps> = ({
  style,
  accessibilityLabel,
  ...props
}) => {
  const theme = useTheme();

  return (
    <Host
      matchContents
      seedColor={theme.colors.primary}
      style={style}
      accessibilityLabel={
        Platform.OS === 'android' ? accessibilityLabel : undefined
      }
    >
      {Platform.OS === 'ios' ? (
        <NativeSwitch
          {...props}
          label={accessibilityLabel}
          modifiers={iosModifiers}
        />
      ) : (
        <NativeSwitch {...props} />
      )}
    </Host>
  );
};

export default Switch;
