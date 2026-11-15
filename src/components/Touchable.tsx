import {
  Platform,
  PlatformColor,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialColors, useTheme, withAlpha } from 'theme';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  /**
   * How a press shows on iOS and Mac: `highlight` fills the row with the
   * system's selection gray, as a table cell does; `opacity` dims the
   * content, as a button does. Android always ripples.
   * @default 'highlight'
   */
  type?: 'highlight' | 'opacity';
  style?: StyleProp<ViewStyle>;
}

/**
 * UITableViewCell's selected background (iOS and Mac): a pressed row, and a
 * row that stays selected (`CardWrapper`'s `opened`).
 */
export const rowHighlight =
  Platform.OS === 'ios' ? PlatformColor('systemGray4') : null;

/** A pressable area with the platform's own press feedback. */
const Touchable: React.FC<TouchableProps> = ({
  type = 'highlight',
  style,
  ...props
}) => {
  const theme = useTheme();

  if (Platform.OS === 'android') {
    return (
      <Pressable
        android_ripple={{
          color: withAlpha((theme.colors as MaterialColors).onSurface, 0.12),
        }}
        style={style}
        {...props}
      />
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed &&
          (type === 'opacity'
            ? { opacity: 0.5 }
            : { backgroundColor: rowHighlight }),
      ]}
      {...props}
    />
  );
};

export default Touchable;
