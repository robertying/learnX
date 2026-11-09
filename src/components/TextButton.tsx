import { PlatformColor } from 'react-native';
import { Button, Host, Text } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  lineLimit,
  padding,
  shapes,
  strikethrough,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import DeviceInfo from 'constants/DeviceInfo';
import { useTheme } from 'theme';
import { withGutter, type TextButtonProps } from './TextButton.shared';

export type { TextButtonProps } from './TextButton.shared';

const textStyles = {
  small: 'footnote',
  regular: 'subheadline',
  large: 'body',
} as const;

/**
 * Point sizes on a Mac: the iOS default sizes of the text styles above, which
 * is what React Native `Text` uses (components/Text). SwiftUI text styles on
 * "Optimize for Mac" switch to the macOS scale instead (subheadline 11 pt,
 * footnote 10 pt), far smaller than the text around the button, and the Mac
 * has no Dynamic Type to follow anyway.
 */
const macSizes = {
  small: 13,
  regular: 15,
  large: 17,
} as const;

/**
 * Vertical padding inside the label on a Mac, so the click target is about
 * as tall as a regular Mac control (22 pt) instead of one line of text. It
 * goes into the gutter, so rows keep their height.
 */
const macPadding = 4;
const macGutter = { vertical: macPadding };

const oneLine = [lineLimit(1), truncationMode('middle')];

const struckModifiers = [
  foregroundStyle(PlatformColor('secondaryLabel')),
  strikethrough({ isActive: true, pattern: 'solid' }),
];

const macLabelModifiers = [
  padding({ vertical: macPadding }),
  contentShape(shapes.rectangle()),
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
  const isMac = DeviceInfo.isMac();

  const modifiers = [
    buttonStyle('borderless'),
    font({
      ...(isMac ? { size: macSizes[size] } : { textStyle: textStyles[size] }),
      weight: bold ? 'semibold' : undefined,
    }),
    ...oneLine,
    ...(struck ? struckModifiers : []),
    ...(disabled ? [disabledModifier(true)] : []),
  ];

  return (
    <Host
      // A filling button gets its width from React Native, so a long label
      // shortens instead of growing past the screen.
      matchContents={fill ? { vertical: true } : true}
      seedColor={theme.colors.primary}
      style={isMac ? withGutter(style, macGutter) : style}
    >
      {isMac ? (
        // A label view, so the padding (and the click target) sits inside the
        // button.
        <Button onPress={onPress} testID={testID} modifiers={modifiers}>
          <Text modifiers={macLabelModifiers}>{children}</Text>
        </Button>
      ) : (
        <Button
          label={children}
          onPress={onPress}
          testID={testID}
          modifiers={modifiers}
        />
      )}
    </Host>
  );
};

export default TextButton;
