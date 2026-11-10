import dayjs from 'dayjs';
import { Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useMinute } from 'hooks/useClock';
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
  // Re-renders the row each minute, past the list's row memoization.
  const now = useMinute();
  const overline = hideCourseName ? publisher : courseName;
  const preview = removeTags(content);
  const time = dayjs(publishTime).from(now);

  return (
    <CardWrapper
      {...restProps}
      accessibilityLabel={cardAccessibilityLabel({
        unread: !hasRead,
        title,
        overline,
        status: time,
        flags: [
          attachment && t('attachment'),
          markedImportant && t('a11yImportant'),
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
          </>
        }
        trailing={time}
      />
    </CardWrapper>
  );
};

export default NoticeCard;
