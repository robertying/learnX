import { PlatformColor } from 'react-native';
import { Button, Text } from '@expo/ui/swift-ui';
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
import { withGutter, type TextButtonProps } from './TextButton.shared';
import ThemedHost from 'components/ThemedHost';

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
 * Padding inside the label, so the tap target reaches the 44 pt minimum of
 * Apple's guidelines at the default text size (one line of footnote,
 * subheadline or body is 18, 20 or 22 pt tall) instead of being one line of
 * text. On a Mac it makes the click target about as tall as a regular Mac
 * control (22 pt). It goes into the gutter, so the label stays where it was
 * and rows keep their size.
 */
const iosPadding = {
  small: { vertical: 13, horizontal: 8 },
  regular: { vertical: 12, horizontal: 8 },
  large: { vertical: 11, horizontal: 8 },
} as const;
const macPadding = { vertical: 4, horizontal: 0 };

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

  const inset = isMac ? macPadding : iosPadding[size];

  return (
    <ThemedHost
      // A filling button gets its width from React Native, so a long label
      // shortens instead of growing past the screen.
      matchContents={fill ? { vertical: true } : true}
      style={withGutter(style, {
        vertical: inset.vertical,
        start: inset.horizontal,
        end: inset.horizontal,
      })}
    >
      {/* A label view, so the padding (and the tap target) sits inside the
          button. */}
      <Button onPress={onPress} testID={testID} modifiers={modifiers}>
        <Text modifiers={[padding(inset), contentShape(shapes.rectangle())]}>
          {children}
        </Text>
      </Button>
    </ThemedHost>
  );
};

export default TextButton;
