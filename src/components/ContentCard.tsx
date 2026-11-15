import type { ReactNode } from 'react';
import { snippet } from 'helpers/search';
import { removeTags } from 'helpers/text';
import CardRow, { cardAccessibilityLabel, type CardFlags } from './CardRow';
import CardWrapper, { type CardWrapperProps } from './CardWrapper';

/** What a notice, assignment or file card takes beside its item. */
export interface ContentCardProps extends CardWrapperProps {
  hideCourseName?: boolean;
  /**
   * Marks an archived item with a glyph, in a list that shows archived items
   * among the rest (a course's lists), where they can't be favorited.
   */
  markArchived?: boolean;
  /**
   * Search words: the title and preview emphasize them, and the preview
   * starts near the first one when it's further in than the preview shows.
   */
  highlight?: readonly string[];
}

/**
 * The plain text of an item's HTML for its preview, starting near the first
 * search word when it's further in than the preview shows.
 */
export const cardPreview = (html?: string, highlight?: readonly string[]) => {
  const text = removeTags(html);
  return highlight ? snippet(text, highlight) : text;
};

interface Props extends Omit<ContentCardProps, 'hideCourseName'> {
  testID: string;
  overline?: string;
  unread?: boolean;
  title: string;
  preview?: string;
  /** The item's own glyphs; favorited and archived follow them. */
  flags: CardFlags;
  /** The time, or a pill, at the end of the first line. */
  trailing: ReactNode;
  /** What screen readers say for `trailing`. */
  status: string;
}

/**
 * A notice, assignment or file in a list: a `CardRow` in a `CardWrapper`,
 * whose spoken label is built from the same values the row shows, so the two
 * say the same thing.
 */
const ContentCard: React.FC<Props> = ({
  overline,
  unread,
  title,
  preview,
  highlight,
  flags: ownFlags,
  trailing,
  status,
  markArchived,
  ...wrapperProps
}) => {
  const flags = [
    ...ownFlags,
    wrapperProps.fav && 'favorited',
    markArchived && wrapperProps.archived && 'archived',
  ] as const;
  return (
    <CardWrapper
      {...wrapperProps}
      accessibilityLabel={cardAccessibilityLabel({
        unread,
        title,
        overline,
        status,
        flags,
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={unread}
        title={title}
        preview={preview}
        highlight={highlight}
        flags={flags}
        trailing={trailing}
      />
    </CardWrapper>
  );
};

export default ContentCard;
