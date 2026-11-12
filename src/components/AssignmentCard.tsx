import { Assignment } from 'data/types/state';
import { removeTags } from 'helpers/text';
import {
  deadlineText,
  deadlineTone,
  deadlineUrgency,
} from 'helpers/assignments';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import { useMinute } from 'hooks/useClock';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import CardRow, {
  CardGlyph,
  CardPill,
  cardAccessibilityLabel,
} from 'components/CardRow';

export interface AssignmentCardProps extends CardWrapperProps {
  data: Assignment;
  hideCourseName?: boolean;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({
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
    isLateSubmission,
  },
  hideCourseName,
  ...restProps
}) => {
  const theme = useTheme();
  const now = useMinute();
  const dueText = deadlineText(deadline, now);
  const urgency = deadlineUrgency(deadline, now, submitted);

  const gradeText = gradeLevel
    ? getAssignmentGradeLevelDescription(gradeLevel)
    : grade !== undefined
      ? String(grade)
      : t('graded');
  const submittedText = isLateSubmission ? t('submittedLate') : t('submitted');
  const statusText = graded ? gradeText : submitted ? submittedText : dueText;
  const overline = hideCourseName ? courseTeacherName : courseName;
  const preview = removeTags(description);
  const hasAnswer = !!(answerContent || answerAttachment);

  const status = graded ? (
    <CardPill testID="grade" tone="primary">
      {gradeText}
    </CardPill>
  ) : submitted ? (
    <CardPill testID="submitted" tone={isLateSubmission ? 'orange' : 'green'}>
      {submittedText}
    </CardPill>
  ) : urgency ? (
    <CardPill testID="due-soon" tone={deadlineTone[urgency]} icon="deadline">
      {dueText}
    </CardPill>
  ) : (
    dueText
  );

  return (
    <CardWrapper
      {...restProps}
      testID="assignment-card"
      accessibilityLabel={cardAccessibilityLabel({
        title,
        overline,
        status: statusText,
        flags: [
          attachment && t('attachment'),
          hasAnswer && t('a11yHasAnswer'),
          restProps.fav && t('a11yFavorited'),
        ],
        preview,
      })}
    >
      <CardRow
        overline={overline}
        title={title}
        preview={preview}
        glyphs={
          <>
            {attachment ? <CardGlyph name="attachment" /> : null}
            {hasAnswer ? <CardGlyph name="answer" /> : null}
            {restProps.fav ? (
              <CardGlyph name="favorited" color={theme.colors.status.red} />
            ) : null}
          </>
        }
        trailing={status}
      />
    </CardWrapper>
  );
};

export default AssignmentCard;
