import dayjs from 'dayjs';
import { File } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import CardRow, { CardGlyph, FileTypeTile } from './CardRow';

export interface FileCardProps extends CardWrapperProps {
  data: File;
  hideCourseName?: boolean;
}

const FileCard: React.FC<React.PropsWithChildren<FileCardProps>> = ({
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
  const details = [category?.title, fileType?.toUpperCase(), size]
    .filter(Boolean)
    .join(' · ');
  const strippedDescription = removeTags(description);

  return (
    <CardWrapper {...restProps}>
      <CardRow
        overline={hideCourseName ? undefined : courseName}
        unread={!!isNew}
        leading={<FileTypeTile fileType={fileType} />}
        title={title}
        preview={
          strippedDescription ? `${details}\n${strippedDescription}` : details
        }
        glyphs={
          markedImportant ? (
            <CardGlyph name="flag" color={theme.colors.status.orange} />
          ) : null
        }
        trailing={dayjs(uploadTime).fromNow()}
      />
    </CardWrapper>
  );
};

export default FileCard;
