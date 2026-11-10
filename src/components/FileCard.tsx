import dayjs from 'dayjs';
import { File } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useMinute } from 'hooks/useClock';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { t } from 'helpers/i18n';
import CardRow, {
  CardGlyph,
  FileTypeTile,
  cardAccessibilityLabel,
} from './CardRow';

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
  // Re-renders the row each minute, past the list's row memoization.
  const now = useMinute();
  const details = [category?.title, fileType?.toUpperCase(), size]
    .filter(Boolean)
    .join(' · ');
  const strippedDescription = removeTags(description);
  const overline = hideCourseName ? undefined : courseName;
  const preview = strippedDescription
    ? `${details}\n${strippedDescription}`
    : details;
  const time = dayjs(uploadTime).from(now);

  return (
    <CardWrapper
      {...restProps}
      accessibilityLabel={cardAccessibilityLabel({
        unread: !!isNew,
        title,
        overline,
        status: time,
        flags: [markedImportant && t('a11yImportant')],
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={!!isNew}
        leading={<FileTypeTile fileType={fileType} />}
        title={title}
        preview={preview}
        glyphs={
          markedImportant ? (
            <CardGlyph name="flag" color={theme.colors.status.orange} />
          ) : null
        }
        trailing={time}
      />
    </CardWrapper>
  );
};

export default FileCard;
