import { Assignment } from 'data/types/state';
import { removeTags } from 'helpers/text';
import {
  deadlineText,
  deadlineTone,
  deadlineUrgency,
} from 'helpers/assignments';
import { getAssignmentGradeLevelDescription, t } from 'helpers/i18n';
import { useMinute } from 'hooks/useClock';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import CardRow, { CardPill, cardAccessibilityLabel } from 'components/CardRow';

export interface AssignmentCardProps extends CardWrapperProps {
  data: Assignment;
  hideCourseName?: boolean;
  /**
   * Marks an archived item with a glyph, in a list that shows archived items
   * among the rest (a course's lists), where they can't be favorited.
   */
  markArchived?: boolean;
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
  markArchived,
  ...restProps
}) => {
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

  const flags = [
    attachment && 'attachment',
    hasAnswer && 'answer',
    restProps.fav && 'favorited',
    markArchived && restProps.archived && 'archived',
  ] as const;

  return (
    <CardWrapper
      {...restProps}
      testID="assignment-card"
      accessibilityLabel={cardAccessibilityLabel({
        title,
        overline,
        status: statusText,
        flags,
        preview,
      })}
    >
      <CardRow
        overline={overline}
        title={title}
        preview={preview}
        flags={flags}
        trailing={status}
      />
    </CardWrapper>
  );
};

export default AssignmentCard;
