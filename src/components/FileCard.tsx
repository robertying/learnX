import { File } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { t } from 'helpers/i18n';
import CardRow, { CardGlyph, cardAccessibilityLabel } from './CardRow';

export interface FileCardProps extends CardWrapperProps {
  data: File;
  hideCourseName?: boolean;
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
  ...restProps
}) => {
  const theme = useTheme();
  // Re-renders the row at midnight, past the list's row memoization.
  const today = useToday();
  const details = [category?.title, fileType?.toUpperCase(), size]
    .filter(Boolean)
    .join(' · ');
  const strippedDescription = removeTags(description);
  const overline = hideCourseName ? undefined : courseName;
  const preview = strippedDescription
    ? `${details}\n${strippedDescription}`
    : details;
  const time = listTime(uploadTime, today);

  return (
    <CardWrapper
      {...restProps}
      accessibilityLabel={cardAccessibilityLabel({
        unread: !!isNew,
        title,
        overline,
        status: time,
        flags: [
          markedImportant && t('a11yImportant'),
          restProps.fav && t('a11yFavorited'),
        ],
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={!!isNew}
        title={title}
        preview={preview}
        glyphs={
          <>
            {markedImportant ? (
              <CardGlyph name="important" color={theme.colors.status.orange} />
            ) : null}
            {restProps.fav ? (
              <CardGlyph name="favorited" color={theme.colors.status.red} />
            ) : null}
          </>
        }
        trailing={time}
      />
    </CardWrapper>
  );
};

export default FileCard;
