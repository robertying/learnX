import {
  Platform,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Caption } from 'components/Text';
import { useTheme } from 'theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Shown above the field. */
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
  ref?: React.Ref<TextInputInstance>;
}

/**
 * A bordered text field over React Native's native text input, so system
 * features (password AutoFill, text content types, the keyboard's return key)
 * work as usual.
 */
const TextField: React.FC<TextFieldProps> = ({
  label,
  disabled,
  style,
  inputStyle,
  multiline,
  ref,
  ...props
}) => {
  const theme = useTheme();

  return (
    <View style={[disabled && styles.disabled, style]}>
      {label ? <Caption style={styles.label}>{label}</Caption> : null}
      <TextInput
        {...props}
        ref={ref}
        multiline={multiline}
        editable={!disabled && props.editable !== false}
        placeholderTextColor={theme.colors.outline}
        selectionColor={
          Platform.OS === 'ios' ? theme.colors.primary : undefined
        }
        cursorColor={theme.colors.primary}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: theme.colors.onSurface,
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surface,
          },
          inputStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginLeft: 4,
  },
  input: {
    minHeight: 48,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: Platform.OS === 'ios' ? 10 : 4,
  },
  multiline: {
    textAlignVertical: 'top',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default TextField;
