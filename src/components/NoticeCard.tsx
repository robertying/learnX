import { Notice } from 'data/types/state';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import ContentCard, { cardPreview, type ContentCardProps } from './ContentCard';

export interface NoticeCardProps extends ContentCardProps {
  data: Notice;
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
  highlight,
  ...restProps
}) => {
  // Re-renders the row at midnight, past the list's row memoization.
  const today = useToday();
  const time = listTime(publishTime, today);

  return (
    <ContentCard
      {...restProps}
      testID="notice-card"
      overline={hideCourseName ? publisher : courseName}
      unread={!hasRead}
      title={title}
      preview={cardPreview(content, highlight)}
      highlight={highlight}
      flags={[attachment && 'attachment', markedImportant && 'important']}
      trailing={time}
      status={time}
    />
  );
};

export default NoticeCard;
