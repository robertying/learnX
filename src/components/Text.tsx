import { useSyncExternalStore } from 'react';
import {
  Dimensions,
  I18nManager,
  Platform,
  StyleSheet,
  Text as NativeText,
  TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from 'theme';

/**
 * The platform's own text styles: Apple's Dynamic Type styles on iOS, iPadOS
 * and Mac, and the Material 3 type scale on Android.
 *
 * | variant       | iOS / Mac (default size)  | Android (M3)   |
 * | ------------- | ------------------------- | -------------- |
 * | `largeTitle`  | Large Title, 34/41 bold   | headlineMedium |
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
 * ("Optimize for Mac") draws them at these sizes too, larger than macOS's own
 * (body 13 pt), which SwiftUI's text styles use there; `Form` matches them on
 * Mac. Android scales them with the system font scale.
 */
export type TextVariant =
  | 'largeTitle'
  | 'title'
  | 'headline'
  | 'body'
  | 'subheadline'
  | 'label'
  | 'footnote'
  | 'caption';

type Ramp = NonNullable<NativeTextProps['dynamicTypeRamp']>;

// Android uses the default typeface: with a named family, React Native only
// picks between normal and bold, so a medium or semibold weight draws regular.
const fontFamily = Platform.select({ ios: 'System', default: undefined });

const iosStyles: Record<TextVariant, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
};

const androidStyles: Record<TextVariant, TextStyle> = {
  largeTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400',
    letterSpacing: 0,
  },
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
  largeTitle: 'largeTitle',
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
}

/*
 * Android scales text sizes nonlinearly above about 1.3x (Android 14+), and
 * React Native scales the line height on its own curve, so a large text's
 * line height can end up smaller than its glyphs and lines overlap. Past
 * that point the line height is left to the font.
 */
const nonlinearFontScale = 1.3;

const subscribeToDimensions = (onChange: () => void) => {
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
};
const getFontScale = () => Dimensions.get('window').fontScale;

/**
 * The text size setting (Dynamic Type on iOS, the font scale on Android),
 * without the window's size, so text doesn't re-render whenever a window
 * (iPad, Mac, a foldable) is resized.
 */
const useFontScale = () =>
  useSyncExternalStore(subscribeToDimensions, getFontScale);

/**
 * The size of an icon drawn beside text, grown with the text size (Dynamic
 * Type, Android font scale) up to twice its size, as a symbol in text is.
 */
export const useTextIconSize = (size: number) =>
  Math.round(size * Math.min(Math.max(useFontScale(), 1), 2));

const StyledText = ({ color, variant, style, ...rest }: StyledTextProps) => {
  const theme = useTheme();
  const fontScale = useFontScale();
  const fontLineHeight =
    Platform.OS === 'android' && fontScale > nonlinearFontScale;
  return (
    <NativeText
      // A new text view for a new text size: React Native lays out a text
      // again only when its props change, so a text size changed while the
      // app runs would leave text at the old size until a relaunch (iOS).
      key={fontScale}
      dynamicTypeRamp={ramps[variant]}
      {...rest}
      style={[
        styles.base,
        textStyles[variant],
        fontLineHeight && styles.fontLineHeight,
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
});

/** Body text in the surface color. */
export const Text = ({ variant = 'body', ...props }: TextProps) => (
  <StyledText {...props} color="onSurface" variant={variant} />
);

/** The title of a detail screen or a section of text. */
export const Title = ({ variant = 'title', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} />
);

/** The title of a card or row. */
export const Headline = ({ variant = 'headline', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" variant={variant} />
);

/** Subheadline text in the secondary color: card previews and list section headers. */
export const Paragraph = ({ variant = 'subheadline', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceMedium" variant={variant} />
);

/** Small, dimmed text for metadata and hints. */
export const Caption = ({ variant = 'footnote', ...props }: TextProps) => (
  <StyledText {...props} color="onSurfaceMedium" variant={variant} />
);
