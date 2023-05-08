import {TouchableOpacity, TouchableOpacityProps} from 'react-native';
import {Text, TextProps, useTheme} from 'react-native-paper';
import Styles from 'constants/Styles';

export interface TextButtonProps extends TextProps<'bodyMedium'> {
  disabled?: boolean;
  containerStyle?: TouchableOpacityProps['style'];
  onPress?: TouchableOpacityProps['onPress'];
}

const TextButton: React.FC<React.PropsWithChildren<TextButtonProps>> = ({
  containerStyle,
  onPress,
  style,
  ellipsizeMode,
  disabled,
  ...restProps
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[Styles.flexRowCenter, containerStyle]}
      activeOpacity={0.6}
      onPress={onPress}
      disabled={disabled}>
      <Text
        style={[
          {
            color: disabled
              ? theme.colors.onSurfaceDisabled
              : theme.colors.primary,
          },
          style,
        ]}
        numberOfLines={1}
        ellipsizeMode={ellipsizeMode ?? 'middle'}
        {...restProps}
      />
    </TouchableOpacity>
  );
};

export default TextButton;
