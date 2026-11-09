import {
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Host,
  Row,
  Text,
  TextButton as ComposeTextButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { useComposeColorOverrides, useTheme } from 'theme';
import type { TextButtonProps } from './TextButton.shared';

export type { TextButtonProps } from './TextButton.shared';

const typography = {
  small: 'labelMedium',
  regular: 'labelLarge',
  large: 'titleMedium',
} as const;

/**
 * The Material 3 text button: a label in the primary color with a ripple,
 * dimmed when disabled, sized in sp so it follows the font size setting.
 */
const TextButton: React.FC<TextButtonProps> = ({
  children,
  onPress,
  disabled,
  size = 'regular',
  bold,
  struck,
  fill,
  style,
  testID,
}) => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();

  const button = (
    <ComposeTextButton
      onClick={onPress}
      enabled={!disabled}
      modifiers={testID ? [testIDModifier(testID)] : undefined}
    >
      <Label size={size} bold={bold} struck={struck}>
        {children}
      </Label>
    </ComposeTextButton>
  );

  return (
    <Host
      matchContents={fill ? { vertical: true } : true}
      seedColor={theme.colors.primary}
      colorOverrides={colorOverrides}
      style={fill ? withGutter(style) : style}
    >
      {fill ? (
        // The host is as wide as React Native makes it. Measured at that exact
        // width, the button would stretch and center its label; a row lets it
        // keep its own width, at the start, and still caps it so it shortens.
        <Row modifiers={rowModifiers}>{button}</Row>
      ) : (
        button
      )}
    </Host>
  );
};

const Label: React.FC<
  Pick<TextButtonProps, 'size' | 'bold' | 'struck'> & { children: string }
> = ({ children, size = 'regular', bold, struck }) => {
  const colors = useMaterialColors();
  return (
    <Text
      maxLines={1}
      overflow="ellipsis"
      // Left unset, the label takes the button's content color (primary, or
      // the disabled color).
      color={struck ? colors.onSurfaceVariant : undefined}
      style={{
        typography: typography[size],
        fontWeight: bold ? 'bold' : undefined,
        textDecoration: struck ? 'lineThrough' : undefined,
      }}
    >
      {children}
    </Text>
  );
};

const rowModifiers = [fillMaxWidth()];

type Margin = DimensionValue | undefined;

const points = (...values: Margin[]) => {
  const value = values.find(margin => margin !== undefined);
  return typeof value === 'number' ? value : 0;
};

/**
 * Moves the button's 12 dp padding and its 48 dp minimum touch height into
 * the gutter (it overlaps its neighbors, like an inline link), so the label lines up with the text around it (as the iOS label
 * does) and the row keeps its height. The offsets add to the caller's margins
 * rather than being replaced by them.
 */
const withGutter = (style: StyleProp<ViewStyle>): StyleProp<ViewStyle> => {
  const {
    margin,
    marginVertical,
    marginHorizontal,
    marginTop,
    marginBottom,
    marginStart,
    marginLeft,
  } = StyleSheet.flatten(style) ?? {};
  return [
    style,
    {
      marginTop: points(marginTop, marginVertical, margin) - 14,
      marginBottom: points(marginBottom, marginVertical, margin) - 14,
      marginStart:
        points(marginStart, marginLeft, marginHorizontal, margin) - 12,
    },
  ];
};

export default TextButton;
