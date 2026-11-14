import { Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { snippet } from 'helpers/search';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import CardRow, { cardAccessibilityLabel } from './CardRow';

export interface NoticeCardProps extends CardWrapperProps {
  data: Notice;
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

const NoticeCard: React.FC<NoticeCardProps> = ({
  data: {
    title,
    content,
    courseName,
    publisher,
    publishTime,
    markedImportant,
    hasRead,
    attachment,
  },
  hideCourseName,
  markArchived,
  highlight,
  ...restProps
}) => {
  // Re-renders the row at midnight, past the list's row memoization.
  const today = useToday();
  const overline = hideCourseName ? publisher : courseName;
  const body = removeTags(content);
  const preview = highlight ? snippet(body, highlight) : body;
  const time = listTime(publishTime, today);

  const flags = [
    attachment && 'attachment',
    markedImportant && 'important',
    restProps.fav && 'favorited',
    markArchived && restProps.archived && 'archived',
  ] as const;

  return (
    <CardWrapper
      {...restProps}
      testID="notice-card"
      accessibilityLabel={cardAccessibilityLabel({
        unread: !hasRead,
        title,
        overline,
        status: time,
        flags,
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={!hasRead}
        title={title}
        preview={preview}
        highlight={highlight}
        flags={flags}
        trailing={time}
      />
    </CardWrapper>
  );
};

export default NoticeCard;
