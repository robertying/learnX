import { ReactNode } from 'react';
import {
  ColorValue,
  Platform,
  StyleSheet,
  Text as NativeText,
  View,
} from 'react-native';
import SystemIcon from 'components/SystemIcon';
import { Caption, Headline, Paragraph, Text } from 'components/Text';
import { fileTypeColor } from 'helpers/filename';
import { t } from 'helpers/i18n';
import { StatusTone, statusContainerOpacity, useTheme } from 'theme';

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
 * line, then the title and a preview. Titles are regular weight, so weight
 * never reads as unread where it doesn't mean it. Unread items get a dot in a
 * gutter on the leading edge on iOS and Mac (Mail, Messages), and a bolder
 * title on Android (Gmail). The gutter is there on every iOS and Mac row, so
 * the text of all lists lines up.
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

  return (
    <View style={styles.root}>
      <CardGutter unread={unread} />
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
            style={[styles.title, !(isAndroid && unread) && styles.regular]}
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

/**
 * The leading gutter of an iOS and Mac list row, with the unread dot in it.
 * Every row has one, so the text of all lists lines up. Nothing on Android.
 * Goes first in a row whose children are 10 apart.
 */
export const CardGutter: React.FC<{ unread?: boolean }> = ({ unread }) => {
  const theme = useTheme();
  if (isAndroid) {
    return null;
  }
  return (
    <View style={styles.gutter}>
      {unread ? (
        <View
          testID="unread-dot"
          style={[styles.dot, { backgroundColor: theme.colors.primary }]}
        />
      ) : null}
    </View>
  );
};

/** A small glyph next to the time, in the caption color unless `color` is set. */
export const CardGlyph: React.FC<{
  name: 'attachment' | 'important' | 'answer';
  color?: ColorValue;
}> = ({ name, color }) => {
  const theme = useTheme();
  return (
    <SystemIcon
      testID={`icon-${name}`}
      name={name}
      size={15}
      color={color ?? theme.colors.onSurfaceMedium}
    />
  );
};

/**
 * A short status in a tinted capsule, such as "Submitted" or a grade: a
 * status hue, or the brand color. Material draws it in the hue's container
 * colors; iOS and Mac in the system color over a light tint of it.
 */
export const CardPill: React.FC<{
  children: string;
  tone: StatusTone | 'primary';
  icon?: 'dueSoon';
  testID?: string;
}> = ({ children, tone, icon, testID }) => {
  const { colors } = useTheme();
  const [container, foreground] =
    tone === 'primary'
      ? [colors.primaryContainer, colors.onPrimaryContainer]
      : [colors.statusContainer[tone], colors.onStatusContainer[tone]];
  // iOS tints with the brand color itself, as with the status hues.
  const tint = tone === 'primary' && !isAndroid ? colors.primary : container;
  return (
    <View testID={testID} style={styles.pill}>
      <View
        testID="pill-tint"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tint, opacity: statusContainerOpacity },
        ]}
      />
      {icon ? <SystemIcon name={icon} size={13} color={foreground} /> : null}
      <Text
        variant="footnote"
        numberOfLines={1}
        style={[styles.pillText, { color: foreground }]}
      >
        {children}
      </Text>
    </View>
  );
};

/** A file's type as a small page with its extension, for file rows. */
export const FileTypeTile: React.FC<{ fileType?: string }> = ({ fileType }) => {
  const theme = useTheme();
  const type = (fileType ?? '').toLowerCase();
  const label = type.slice(0, 4).toUpperCase();
  const tone = fileTypeColor(type);
  return (
    <View
      testID="file-type"
      style={[styles.tile, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      {label ? (
        <View
          style={[
            styles.tileLabel,
            { backgroundColor: theme.colors.status[tone] },
          ]}
        >
          {/* four letters (DOCX, PPTX) are about as wide as the tile: shrink
              rather than wrap */}
          <NativeText
            style={[styles.tileText, { color: theme.colors.onStatus[tone] }]}
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {label}
          </NativeText>
        </View>
      ) : (
        <SystemIcon
          name="file"
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
  regular: {
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
    overflow: 'hidden',
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
