import { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import SystemIcon from 'components/SystemIcon';
import { Caption, Headline, Paragraph, Text } from 'components/Text';
import { t } from 'helpers/i18n';
import { StatusTone, statusContainerOpacity, useTheme } from 'theme';

const isAndroid = Platform.OS === 'android';

/**
 * Titles get one line, as in Mail, except at accessibility text sizes, where
 * one line holds only a few characters.
 */
const useTitleLines = () => (useWindowDimensions().fontScale >= 1.5 ? 3 : 1);
// Mail's first line is Subheadline; a Material three-line item's overline is
// small (bodySmall).
const metaVariant = isAndroid ? 'footnote' : 'subheadline';

export interface CardRowProps {
  /** Whose item this is (the course, or the publisher inside a course). */
  overline?: string;
  /** Marks the item unread. Leave unset for items that are never unread. */
  unread?: boolean;
  /** Next to the time: a small glyph for each, such as a paperclip. */
  flags?: CardFlags;
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
  unread,
  flags,
  trailing,
  title,
  preview,
}) => {
  const titleLines = useTitleLines();

  const meta = (
    <View style={styles.meta}>
      {flags?.filter(isFlag).map(flag => (
        <CardGlyph key={flag} name={flag} />
      ))}
      {typeof trailing === 'string' ? (
        <Caption variant={metaVariant} numberOfLines={1}>
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
            numberOfLines={titleLines}
            style={[styles.title, !(isAndroid && unread) && styles.regular]}
          >
            {title}
          </Headline>
          {overline ? null : meta}
        </View>
        {preview ? <Paragraph numberOfLines={2}>{preview}</Paragraph> : null}
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
  /** The glyphs shown, said by name, such as "Attachment". */
  flags?: CardFlags;
  preview?: string;
}) =>
  [
    unread ? t('unread') : undefined,
    title,
    overline,
    status,
    ...flags.filter(isFlag).map(flag => cardFlags[flag].label()),
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

/**
 * What a row can show as a small glyph next to the time, with the name a
 * screen reader says for it and the status hue it is drawn in (the caption
 * color when it has none).
 */
export type CardFlag =
  | 'attachment'
  | 'answer'
  | 'important'
  | 'favorited'
  | 'archived';

const cardFlags: Record<CardFlag, { label: () => string; tone?: StatusTone }> =
  {
    attachment: { label: () => t('attachment') },
    answer: { label: () => t('a11yHasAnswer') },
    important: { label: () => t('a11yImportant'), tone: 'orange' },
    favorited: { label: () => t('a11yFavorited'), tone: 'red' },
    archived: { label: () => t('archived') },
  };

/** A row's flags in the order shown; `false` and `undefined` are left out. */
type CardFlags = readonly (CardFlag | false | undefined)[];

const isFlag = (flag: CardFlag | false | undefined): flag is CardFlag => !!flag;

const CardGlyph: React.FC<{ name: CardFlag }> = ({ name }) => {
  const theme = useTheme();
  const { tone } = cardFlags[name];
  return (
    <SystemIcon
      testID={`icon-${name}`}
      name={name}
      size={15}
      color={tone ? theme.colors.status[tone] : theme.colors.onSurfaceMedium}
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
  icon?: 'deadline';
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
  // The lines 4 apart, with 2 above and below.
  content: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
    gap: 4,
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
});

export default CardRow;
