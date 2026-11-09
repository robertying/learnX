import { Assignment } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { deadlineText, isDueSoon } from 'helpers/assignments';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import useMinute from 'hooks/useMinute';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import CardRow, { CardGlyph, CardPill } from 'components/CardRow';

export interface AssignmentCardProps extends CardWrapperProps {
  data: Assignment;
  hideCourseName?: boolean;
}

const AssignmentCard: React.FC<
  React.PropsWithChildren<AssignmentCardProps>
> = ({
  data: {
    courseName,
    courseTeacherName,
    title,
    description,
    deadline,
    attachment,
    submitted,
    graded,
    grade,
    gradeLevel,
    answerContent,
    answerAttachment,
  },
  hideCourseName,
  ...restProps
}) => {
  const theme = useTheme();
  const now = useMinute();
  const dueText = deadlineText(deadline, now);
  const dueSoon = isDueSoon(deadline, now);

  const status = graded ? (
    <CardPill testID="grade" color={theme.colors.primary}>
      {gradeLevel
        ? getAssignmentGradeLevelDescription(gradeLevel)
        : grade !== undefined
          ? String(grade)
          : t('graded')}
    </CardPill>
  ) : submitted ? (
    <CardPill testID="submitted" color={theme.colors.status.green}>
      {t('submitted')}
    </CardPill>
  ) : dueSoon ? (
    <CardPill
      testID="due-soon"
      color={theme.colors.status.red}
      icon="clock-outline"
    >
      {dueText}
    </CardPill>
  ) : (
    dueText
  );

  return (
    <CardWrapper {...restProps}>
      <CardRow
        overline={hideCourseName ? courseTeacherName : courseName}
        title={title}
        preview={removeTags(description)}
        glyphs={
          <>
            {attachment ? <CardGlyph name="attachment" /> : null}
            {answerContent || answerAttachment ? (
              <CardGlyph name="key-variant" />
            ) : null}
          </>
        }
        trailing={status}
      />
    </CardWrapper>
  );
};

export default AssignmentCard;
