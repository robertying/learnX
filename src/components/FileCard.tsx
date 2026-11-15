import { displayFileSize } from 'helpers/filename';
import { File } from 'data/types/state';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import ContentCard, { cardPreview, type ContentCardProps } from './ContentCard';

export interface FileCardProps extends ContentCardProps {
  data: File;
}

const FileCard: React.FC<FileCardProps> = ({
  data: {
    title,
    description,
    courseName,
    size,
    fileType,
    markedImportant,
    isNew,
    uploadTime,
    category,
  },
  hideCourseName,
  highlight,
  ...restProps
}) => {
  // Re-renders the row at midnight, past the list's row memoization.
  const today = useToday();
  const details = [
    category?.title,
    fileType?.toUpperCase(),
    size && displayFileSize(size),
  ]
    .filter(Boolean)
    .join(' · ');
  const strippedDescription = cardPreview(description, highlight);
  const time = listTime(uploadTime, today);

  return (
    <ContentCard
      {...restProps}
      testID="file-card"
      overline={hideCourseName ? undefined : courseName}
      unread={!!isNew}
      title={title}
      preview={
        strippedDescription ? `${details}\n${strippedDescription}` : details
      }
      highlight={highlight}
      flags={[markedImportant && 'important']}
      trailing={time}
      status={time}
    />
  );
};

export default FileCard;
