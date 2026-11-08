import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons, {
  MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons';
import { useTheme, withAlpha } from 'theme';

export interface IconButtonProps {
  /** A Material Design Icons name, or a render function for another icon set. */
  icon:
    | MaterialDesignIconsIconName
    | ((props: { size: number; color: string }) => React.ReactNode);
  size?: number;
  /** `contained` puts the icon on a filled circle, to show a mode is on. */
  mode?: 'contained';
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const PADDING = 8;

/** A round icon-only button (Material 3 standard icon button). */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 24,
  mode,
  disabled,
  onPress,
  accessibilityLabel,
  testID,
  style,
}) => {
  const theme = useTheme();

  const color = disabled
    ? theme.colors.onSurfaceDisabled
    : theme.colors.onSurfaceVariant;
  const backgroundColor =
    mode === 'contained'
      ? disabled
        ? theme.colors.surfaceDisabled
        : theme.colors.surfaceVariant
      : undefined;
  const rippleColor = withAlpha(theme.colors.onSurfaceVariant, 0.12);
  const buttonSize = size + 2 * PADDING;

  return (
    <View
      style={[
        styles.container,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.touchable,
          Platform.OS !== 'android' && pressed
            ? { backgroundColor: rippleColor }
            : undefined,
        ]}
        android_ripple={{ color: rippleColor, borderless: true }}
        disabled={disabled}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {typeof icon === 'function' ? (
          icon({ size, color })
        ) : (
          <MaterialCommunityIcons name={icon} size={size} color={color} />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    margin: 6,
    // Keeps the old wrapper's compact look in headers.
    marginVertical: -2,
    marginHorizontal: 0,
    transform: [{ scale: 0.8 }],
  },
  touchable: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IconButton;
