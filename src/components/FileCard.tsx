import { displayFileSize } from 'helpers/filename';
import { File } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import CardRow, { cardAccessibilityLabel } from './CardRow';

export interface FileCardProps extends CardWrapperProps {
  data: File;
  hideCourseName?: boolean;
  /**
   * Marks an archived item with a glyph, in a list that shows archived items
   * among the rest (a course's lists), where they can't be favorited.
   */
  markArchived?: boolean;
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
  markArchived,
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
  const strippedDescription = removeTags(description);
  const overline = hideCourseName ? undefined : courseName;
  const preview = strippedDescription
    ? `${details}\n${strippedDescription}`
    : details;
  const time = listTime(uploadTime, today);

  const flags = [
    markedImportant && 'important',
    restProps.fav && 'favorited',
    markArchived && restProps.archived && 'archived',
  ] as const;

  return (
    <CardWrapper
      {...restProps}
      testID="file-card"
      accessibilityLabel={cardAccessibilityLabel({
        unread: !!isNew,
        title,
        overline,
        status: time,
        flags,
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={!!isNew}
        title={title}
        preview={preview}
        flags={flags}
        trailing={time}
      />
    </CardWrapper>
  );
};

export default FileCard;
