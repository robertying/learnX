import { StyleSheet, View } from 'react-native';
import { Button } from '@fluentui/react-components';
import { useTheme } from 'theme';
import type { TextButtonProps } from './TextButton.shared';

export type { TextButtonProps } from './TextButton.shared';

const fontSizes = { small: 12, regular: 14, large: 14 } as const;

/**
 * A borderless Fluent button with its label in the accent color, as Windows
 * draws a hyperlink button. `fill` shortens a long label to one line.
 */
const TextButton: React.FC<TextButtonProps> = ({
  children,
  accessibilityLabel,
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
  return (
    <View style={[!fill && styles.ownSize, style]}>
      <Button
        appearance="transparent"
        size={size === 'small' ? 'small' : 'medium'}
        disabled={disabled}
        onClick={onPress}
        aria-label={accessibilityLabel}
        data-testid={testID}
        style={{
          color: disabled
            ? undefined
            : ((struck
                ? theme.colors.onSurfaceMedium
                : theme.colors.primary) as string),
          fontSize: fontSizes[size],
          fontWeight: bold ? 600 : 400,
          textDecorationLine: struck ? 'line-through' : undefined,
          minWidth: 0,
          maxWidth: '100%',
          justifyContent: 'flex-start',
          ...(fill ? { width: '100%' } : null),
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </span>
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  // Holds the button at its own size wherever it's placed, without taking
  // the place itself (`alignSelf` would override a row's centering).
  ownSize: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});

export default TextButton;
