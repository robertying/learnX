import { Assignment } from 'data/types/state';
import {
  deadlineText,
  deadlineTone,
  deadlineUrgency,
  gradeLabel,
} from 'helpers/assignments';
import { t } from 'helpers/i18n';
import { useMinute } from 'hooks/useClock';
import { CardPill } from './CardRow';
import ContentCard, { cardPreview, type ContentCardProps } from './ContentCard';

export interface AssignmentCardProps extends ContentCardProps {
  data: Assignment;
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
  highlight,
  ...restProps
}) => {
  const now = useMinute();
  const dueText = deadlineText(deadline, now);
  const urgency = deadlineUrgency(deadline, now, submitted);

  const gradeText = gradeLabel({ grade, gradeLevel }) ?? t('graded');
  const submittedText = isLateSubmission ? t('submittedLate') : t('submitted');
  const statusText = graded ? gradeText : submitted ? submittedText : dueText;
  const overline = hideCourseName ? courseTeacherName : courseName;
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
    <ContentCard
      {...restProps}
      testID="assignment-card"
      overline={overline}
      title={title}
      preview={cardPreview(description, highlight)}
      highlight={highlight}
      flags={[attachment && 'attachment', hasAnswer && 'answer']}
      trailing={status}
      status={statusText}
    />
  );
};

export default AssignmentCard;
