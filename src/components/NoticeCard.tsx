import { Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { listTime } from 'helpers/listTime';
import { useToday } from 'hooks/useClock';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { t } from 'helpers/i18n';
import CardRow, { CardGlyph, cardAccessibilityLabel } from './CardRow';

export interface NoticeCardProps extends CardWrapperProps {
  data: Notice;
  hideCourseName?: boolean;
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
  ...restProps
}) => {
  const theme = useTheme();
  // Re-renders the row at midnight, past the list's row memoization.
  const today = useToday();
  const overline = hideCourseName ? publisher : courseName;
  const preview = removeTags(content);
  const time = listTime(publishTime, today);

  return (
    <CardWrapper
      {...restProps}
      testID="notice-card"
      accessibilityLabel={cardAccessibilityLabel({
        unread: !hasRead,
        title,
        overline,
        status: time,
        flags: [
          attachment && t('attachment'),
          markedImportant && t('a11yImportant'),
          restProps.fav && t('a11yFavorited'),
        ],
        preview,
      })}
    >
      <CardRow
        overline={overline}
        unread={!hasRead}
        title={title}
        preview={preview}
        glyphs={
          <>
            {attachment ? <CardGlyph name="attachment" /> : null}
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

export default NoticeCard;
