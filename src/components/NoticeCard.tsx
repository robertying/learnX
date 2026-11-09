import dayjs from 'dayjs';
import { Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import CardRow, { CardGlyph } from './CardRow';

export interface NoticeCardProps extends CardWrapperProps {
  data: Notice;
  hideCourseName?: boolean;
}

const NoticeCard: React.FC<React.PropsWithChildren<NoticeCardProps>> = ({
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
  ...restProps
}) => {
  const theme = useTheme();

  return (
    <CardWrapper {...restProps}>
      <CardRow
        overline={hideCourseName ? publisher : courseName}
        unread={!hasRead}
        title={title}
        preview={removeTags(content)}
        glyphs={
          <>
            {attachment ? <CardGlyph name="attachment" /> : null}
            {markedImportant ? (
              <CardGlyph name="flag" color={theme.colors.status.orange} />
            ) : null}
          </>
        }
        trailing={dayjs(publishTime).fromNow()}
      />
    </CardWrapper>
  );
};

export default NoticeCard;
