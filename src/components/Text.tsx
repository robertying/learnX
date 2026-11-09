import {
  I18nManager,
  Platform,
  StyleSheet,
  Text as NativeText,
  TextProps as NativeTextProps,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from 'theme';

/**
 * The platform's own text styles: Apple's Dynamic Type styles on iOS, iPadOS
 * and Mac, and the Material 3 type scale on Android.
 *
 * | variant       | iOS / Mac (default size)  | Android (M3)   |
 * | ------------- | ------------------------- | -------------- |
 * | `title`       | Title 3, 20/25 semibold   | titleLarge     |
 * | `headline`    | Headline, 17/22 semibold  | titleMedium    |
 * | `body`        | Body, 17/22               | bodyLarge      |
 * | `subheadline` | Subheadline, 15/20        | bodyMedium     |
 * | `label`       | Subheadline, 15/20 medium | labelLarge     |
 * | `footnote`    | Footnote, 13/18           | bodySmall      |
 * | `caption`     | Caption 2, 11/13          | labelSmall     |
 *
 * On iOS each variant scales with the user's text size along its own Dynamic
 * Type curve (`dynamicTypeRamp`), as UIKit's text styles do. Mac Catalyst
 * ("Optimize for Mac") draws these at 77%, which gives macOS's own sizes
 * (body 13 pt). Android scales them with the system font scale.
 */
export type TextVariant =
  | 'title'
  | 'headline'
  | 'body'
  | 'subheadline'
  | 'label'
  | 'footnote'
  | 'caption';

type Ramp = NonNullable<NativeTextProps['dynamicTypeRamp']>;

const fontFamily = Platform.select({ ios: 'System', default: 'sans-serif' });

const iosStyles: Record<TextVariant, TextStyle> = {
  title: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
};

const androidStyles: Record<TextVariant, TextStyle> = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '400', letterSpacing: 0 },
  headline: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.5 },
  subheadline: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.25,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
};

const ramps: Record<TextVariant, Ramp> = {
  title: 'title3',
  headline: 'headline',
  body: 'body',
  subheadline: 'subheadline',
  label: 'subheadline',
  footnote: 'footnote',
  caption: 'caption2',
};

/**
 * The style of a text variant, for text that isn't drawn by `Text` (such as a
 * `TextInput`). Prefer the components below.
 */
export const textStyles: Record<TextVariant, TextStyle> = StyleSheet.create(
  Object.fromEntries(
    Object.entries(Platform.OS === 'ios' ? iosStyles : androidStyles).map(
      ([variant, style]) => [variant, { fontFamily, ...style }],
    ),
  ) as Record<TextVariant, TextStyle>,
);

export interface TextProps extends NativeTextProps {
  /** The platform text style. Defaults to the component's own. */
  variant?: TextVariant;
}

const writingDirection = I18nManager.getConstants().isRTL ? 'rtl' : 'ltr';

interface StyledTextProps extends TextProps {
  color: 'onSurface' | 'onSurfaceHigh' | 'onSurfaceMedium';
  variant: TextVariant;
  /** A little space above and below, between stacked titles and captions. */
  spaced?: boolean;
}

/*
 * Android scales text sizes nonlinearly above about 1.3x (Android 14+), and
 * React Native scales the line height on its own curve, so a large text's
 * line height can end up smaller than its glyphs and lines overlap. Past
 * that point the line height is left to the font.
 */
const nonlinearFontScale = 1.3;

const StyledText = ({
  color,
  variant,
  spaced,
  style,
  ...rest
}: StyledTextProps) => {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const fontLineHeight =
    Platform.OS === 'android' && fontScale > nonlinearFontScale;
  return (
    <NativeText
      dynamicTypeRamp={ramps[variant]}
      {...rest}
      style={[
        styles.base,
        textStyles[variant],
        fontLineHeight && styles.fontLineHeight,
        spaced && styles.spaced,
        { color: theme.colors[color], writingDirection },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    textAlign: 'left',
  },
  fontLineHeight: {
    lineHeight: undefined,
  },
  spaced: {
    marginVertical: 2,
  },
});

/** Body text in the surface color. */
export const Text = ({ variant = 'body', ...props }: TextProps) => (
  <StyledText {...props} color="onSurface" variant={variant} />
);

/** The title of a detail screen or a section of text. */
export const Title = ({ variant = 'title', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} spaced />
);

/** The title of a card or row. */
export const Headline = ({ variant = 'headline', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} spaced />
);

/** A secondary title, such as a card's course name. */
export const Subheading = ({
  variant = 'subheadline',
  ...props
}: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} spaced />
);

/** Body text in cards. */
export const Paragraph = ({ variant = 'subheadline', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} spaced />
);

/** Small, dimmed text for metadata and hints. */
export const Caption = ({ variant = 'footnote', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceMedium" variant={variant} spaced />
);
