import { ReactNode } from 'react';
import { Platform, StyleSheet, Text as NativeText, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { Caption, Headline, Paragraph, textStyles } from 'components/Text';
import { t } from 'helpers/i18n';
import { shade, textOn, useTheme, withAlpha } from 'theme';

const isAndroid = Platform.OS === 'android';
// Mail's first line is Subheadline; a Material three-line item's overline is
// small (bodySmall).
const metaVariant = isAndroid ? 'footnote' : 'subheadline';

export interface CardRowProps {
  /** Whose item this is (the course, or the publisher inside a course). */
  overline?: string;
  /** A leading view, such as a file's type. */
  leading?: ReactNode;
  /** Marks the item unread. Leave unset for items that are never unread. */
  unread?: boolean;
  /** Next to the time: small glyphs such as a paperclip or a flag. */
  glyphs?: ReactNode;
  /** The time, or a pill, at the end of the first line. */
  trailing?: ReactNode;
  title: string;
  /** Up to two lines under the title. */
  preview?: string;
}

/**
 * A list item laid out like Mail on iOS and Mac and like a Material 3
 * three-line list item on Android: who it's from and when on a small first
 * line, then the title and a preview. Unread items get a dot in a gutter on
 * the leading edge on iOS and Mac (Mail, Messages), and a bolder title on
 * Android (Gmail), where read titles are regular weight. The gutter is there
 * on every iOS and Mac row, so the text of all lists lines up.
 */
const CardRow: React.FC<CardRowProps> = ({
  overline,
  leading,
  unread,
  glyphs,
  trailing,
  title,
  preview,
}) => {
  const theme = useTheme();

  const meta = (
    <View style={styles.meta}>
      {glyphs}
      {typeof trailing === 'string' ? (
        <Caption variant={metaVariant} numberOfLines={1} style={styles.time}>
          {trailing}
        </Caption>
      ) : (
        trailing
      )}
    </View>
  );

  const dot = (
    <View
      testID="unread-dot"
      style={[styles.dot, { backgroundColor: theme.colors.primary }]}
    />
  );

  return (
    <View style={styles.root}>
      {!isAndroid ? (
        <View style={styles.gutter}>{unread ? dot : null}</View>
      ) : null}
      {leading}
      <View style={styles.content}>
        {overline ? (
          <View style={styles.firstLine}>
            <Caption
              variant={metaVariant}
              numberOfLines={1}
              style={styles.overline}
            >
              {overline}
            </Caption>
            {meta}
          </View>
        ) : null}
        <View style={styles.firstLine}>
          <Headline
            numberOfLines={1}
            style={[
              styles.title,
              isAndroid && unread === false && styles.titleRead,
            ]}
          >
            {title}
          </Headline>
          {overline ? null : meta}
        </View>
        {preview ? (
          <Paragraph
            numberOfLines={2}
            style={{ color: theme.colors.onSurfaceMedium }}
          >
            {preview}
          </Paragraph>
        ) : null}
      </View>
    </View>
  );
};

const previewLength = 120;

/**
 * What a screen reader says for a row: its title first, then whose it is and
 * when, then the states and glyphs it shows only visually (the unread dot or
 * bold title, a flag, a paperclip), then the preview.
 */
export const cardAccessibilityLabel = ({
  unread,
  title,
  overline,
  status,
  flags = [],
  preview,
}: {
  unread?: boolean;
  title: string;
  overline?: string;
  status?: string;
  /** Spoken names of the glyphs shown, such as "Attachment". */
  flags?: (string | false | undefined)[];
  preview?: string;
}) =>
  [
    unread ? t('unread') : undefined,
    title,
    overline,
    status,
    ...flags,
    // The row shows two lines of it; a whole notice is too long to listen to.
    preview && preview.length > previewLength
      ? `${preview.slice(0, previewLength)}…`
      : preview,
  ]
    .filter(Boolean)
    .join(', ');

/** A small glyph next to the time, in the caption color unless `color` is set. */
export const CardGlyph: React.FC<{
  name: 'attachment' | 'flag' | 'key-variant';
  color?: string;
}> = ({ name, color }) => {
  const theme = useTheme();
  return (
    <Icon
      testID={`icon-${name}`}
      name={name}
      size={15}
      color={color ?? theme.colors.onSurfaceMedium}
    />
  );
};

/** A short status in a tinted capsule, such as "Submitted" or a grade. */
export const CardPill: React.FC<{
  children: string;
  color: string;
  icon?: 'clock-outline';
  testID?: string;
}> = ({ children, color, icon, testID }) => {
  const theme = useTheme();
  // On the light tint the color itself is too faint for small text.
  const foreground = theme.dark ? color : shade(color, 0.8);
  return (
    <View
      testID={testID}
      style={[styles.pill, { backgroundColor: withAlpha(color, 0.15) }]}
    >
      {icon ? <Icon name={icon} size={13} color={foreground} /> : null}
      <NativeText
        numberOfLines={1}
        style={[textStyles.footnote, styles.pillText, { color: foreground }]}
      >
        {children}
      </NativeText>
    </View>
  );
};

const fileTypeColor = (
  type: string,
  status: ReturnType<typeof useTheme>['colors']['status'],
) => {
  switch (type) {
    case 'pdf':
      return status.red;
    case 'doc':
    case 'docx':
      return status.blue;
    case 'ppt':
    case 'pptx':
    case 'key':
      return status.orange;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return status.green;
    default:
      return status.grey;
  }
};

/** A file's type as a small page with its extension, for file rows. */
export const FileTypeTile: React.FC<{ fileType?: string }> = ({ fileType }) => {
  const theme = useTheme();
  const type = (fileType ?? '').toLowerCase();
  const label = type.slice(0, 4).toUpperCase();
  const color = fileTypeColor(type, theme.colors.status);
  return (
    <View
      testID="file-type"
      style={[styles.tile, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      {label ? (
        <View style={[styles.tileLabel, { backgroundColor: color }]}>
          {/* four letters (DOCX, PPTX) are about as wide as the tile: shrink
              rather than wrap */}
          <NativeText
            style={[styles.tileText, { color: textOn(color) }]}
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {label}
          </NativeText>
        </View>
      ) : (
        <Icon
          name="file-outline"
          size={20}
          color={theme.colors.onSurfaceMedium}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  gutter: {
    width: 10,
    marginStart: -8,
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  firstLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overline: {
    flex: 1,
  },
  title: {
    flex: 1,
  },
  titleRead: {
    fontWeight: '400',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    marginVertical: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: isAndroid ? 8 : 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  pillText: {
    fontWeight: '600',
  },
  tile: {
    width: 32,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  tileLabel: {
    maxWidth: 30,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  tileText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

export default CardRow;
