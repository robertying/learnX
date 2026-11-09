import { PlatformColor } from 'react-native';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  lineLimit,
  strikethrough,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'theme';
import type { TextButtonProps } from './TextButton.shared';

export type { TextButtonProps } from './TextButton.shared';

const textStyles = {
  small: 'footnote',
  regular: 'subheadline',
  large: 'body',
} as const;

const oneLine = [lineLimit(1), truncationMode('middle')];

const struckModifiers = [
  foregroundStyle(PlatformColor('secondaryLabel')),
  strikethrough({ isActive: true, pattern: 'solid' }),
];

/**
 * A borderless SwiftUI `Button`: a label in the tint color that dims while
 * pressed, grays out when disabled and follows Dynamic Type.
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

  return (
    <Host
      // A filling button gets its width from React Native, so a long label
      // shortens instead of growing past the screen.
      matchContents={fill ? { vertical: true } : true}
      seedColor={theme.colors.primary}
      style={style}
    >
      <Button
        label={children}
        onPress={onPress}
        testID={testID}
        modifiers={[
          buttonStyle('borderless'),
          font({
            textStyle: textStyles[size],
            weight: bold ? 'semibold' : undefined,
          }),
          ...oneLine,
          ...(struck ? struckModifiers : []),
          ...(disabled ? [disabledModifier(true)] : []),
        ]}
      />
    </Host>
  );
};

export default TextButton;
