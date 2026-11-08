import {
  Host,
  Text,
  TextButton as ComposeTextButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
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

  return (
    <Host
      matchContents={fill ? { vertical: true } : true}
      seedColor={theme.colors.primary}
      colorOverrides={colorOverrides}
      style={style}
    >
      <ComposeTextButton
        onClick={onPress}
        enabled={!disabled}
        modifiers={testID ? [testIDModifier(testID)] : undefined}
      >
        <Label size={size} bold={bold} struck={struck}>
          {children}
        </Label>
      </ComposeTextButton>
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

export default TextButton;
