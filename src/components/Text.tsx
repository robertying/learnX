import {
  I18nManager,
  Platform,
  StyleSheet,
  Text as NativeText,
  TextProps as NativeTextProps,
} from 'react-native';
import { useTheme } from 'theme';

export type TextProps = NativeTextProps;

const writingDirection = I18nManager.getConstants().isRTL ? 'rtl' : 'ltr';

interface StyledTextProps extends TextProps {
  color: 'onSurface' | 'onSurfaceHigh' | 'onSurfaceMedium';
  typeStyle: TextProps['style'];
}

const StyledText = ({ color, typeStyle, style, ...rest }: StyledTextProps) => {
  const theme = useTheme();
  return (
    <NativeText
      {...rest}
      style={[
        styles.base,
        typeStyle,
        { color: theme.colors[color], writingDirection },
        style,
      ]}
    />
  );
};

/*
 * The type scale the app had with React Native Paper (MD3 `Text` without a
 * variant, and the v2 `Title`, `Subheading`, `Paragraph` and `Caption`), so
 * moving off Paper doesn't change how text looks.
 */
const styles = StyleSheet.create({
  base: {
    textAlign: 'left',
  },
  body: {
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    fontWeight: '400',
    letterSpacing: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 30,
    marginVertical: 2,
    letterSpacing: 0.15,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 2,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 2,
    letterSpacing: 0.25,
  },
  caption: {
    fontSize: 12,
    lineHeight: 20,
    marginVertical: 2,
    letterSpacing: 0.4,
  },
});

/** Body text in the surface color. */
export const Text = (props: TextProps) => (
  <StyledText {...props} color="onSurface" typeStyle={styles.body} />
);

/** A card or section title. */
export const Title = (props: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" typeStyle={styles.title} />
);

/** A secondary title, such as a card's course name. */
export const Subheading = (props: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" typeStyle={styles.subheading} />
);

/** Body text in cards. */
export const Paragraph = (props: TextProps) => (
  <StyledText {...props} color="onSurfaceHigh" typeStyle={styles.paragraph} />
);

/** Small, dimmed text for metadata and hints. */
export const Caption = (props: TextProps) => (
  <StyledText {...props} color="onSurfaceMedium" typeStyle={styles.caption} />
);
