import { useCallback } from 'react';
import dayjs from 'dayjs';
import {
  ExcellentHomework,
  HomeworkCompletionType,
  HomeworkSubmissionType,
  RemoteFile,
} from '@robertying/thu-learn-lib';
import FormWebView from 'components/FormWebView';
import {
  AssignmentDetailParamList,
  MainStackScreenProps,
} from 'navigation/types';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useHeaderButtons from 'hooks/useHeaderButtons';
import { useMinute } from 'hooks/useClock';
import { removeTags } from 'helpers/text';
import { attachmentFile } from 'helpers/attachments';
import {
  formatLiteral,
  getAssignmentGradeLevelDescription,
  t,
} from 'helpers/i18n';
import {
  deadlineText,
  deadlineTone,
  deadlineUrgency,
} from 'helpers/assignments';
import { Assignment } from 'data/types/state';
import { useAssignment, useExcellentHomeworkDetail } from 'data/content';
import { useHasSubmissionDraft } from 'data/submissionDrafts';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  Form,
  FormFile,
  FormLink,
  FormParagraph,
  type FormRowPosition,
  FormScreen,
  FormSection,
  FormText,
  FormTitle,
} from 'components/Form';

type Props = MainStackScreenProps<
  AssignmentDetailParamList,
  'AssignmentDetail'
>;

const AssignmentDetail: React.FC<Props> = ({ route, navigation }) => {
  const assignment = useAssignment(route.params.id);

  useHeaderTitle(
    navigation,
    assignment?.courseName,
    assignment?.courseTeacherName,
  );

  if (!assignment) {
    return <NotFound />;
  }

  return (
    <AssignmentDetailContent assignment={assignment} navigation={navigation} />
  );
};

/** An excellent homework, its attachment fetched when it's shown. */
const ExcellentHomeworkRow: React.FC<{
  homework: ExcellentHomework;
  onFileOpen: (file?: RemoteFile) => void;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}> = ({ homework, onFileOpen, position }) => {
  const { gradeAttachment, submittedAttachment, author } =
    useExcellentHomeworkDetail(homework);
  const homeworkAttachment = gradeAttachment || submittedAttachment;
  const authorName = author.anonymous ? t('anonymous') : author.name;
  return (
    <FormFile
      title={homeworkAttachment?.name ?? homework.title}
      subtitle={t('excellentHomeworkBy', { name: authorName })}
      icon="excellent"
      disabled={!homeworkAttachment}
      onPress={() => onFileOpen(homeworkAttachment)}
      position={position}
    />
  );
};

const AssignmentDetailContent: React.FC<{
  assignment: Assignment;
  navigation: Props['navigation'];
}> = ({ assignment, navigation }) => {
  const detailNavigator = useDetailNavigator();
  const hasDraft = useHasSubmissionDraft(assignment.id);

  const {
    id,
    title,
    deadline,
    lateSubmissionDeadline,
    description,
    completionType,
    submissionType,
    attachment,
    submitted,
    isLateSubmission,
    submitTime,
    submittedAttachment,
    submittedContent,
    graded,
    graderName,
    gradeTime,
    grade,
    gradeLevel,
    gradeAttachment,
    gradeContent,
    answerAttachment,
    answerContent,
    excellentHomeworkList,
  } = assignment;

  const now = useMinute();
  const urgency = deadlineUrgency(deadline, now, submitted);
  const closed = dayjs(now).isAfter(dayjs(deadline));
  // Past the deadline but still taking late submissions.
  const lateOpen =
    !!lateSubmissionDeadline && dayjs(now).isBefore(lateSubmissionDeadline);

  // An empty description shows as text, with no web view to wait for.
  const hasDescription = !!description?.trim();

  const handleFileOpen = (remoteFile?: RemoteFile) => {
    if (remoteFile) {
      navigation.push('FileDetail', {
        attachment: attachmentFile(assignment, remoteFile),
      });
    }
  };

  const handleSubmit = useCallback(() => {
    if (detailNavigator) {
      detailNavigator.push('AssignmentSubmission', { id });
    } else {
      navigation.navigate('AssignmentSubmissionStack', {
        screen: 'AssignmentSubmission',
        params: { id },
      });
    }
  }, [detailNavigator, id, navigation]);

  useHeaderButtons(navigation, 'right', [
    submissionType !== HomeworkSubmissionType.OFFLINE && {
      id: 'submit',
      label: t('submit'),
      icon: 'upload',
      disabled: closed,
      onPress: handleSubmit,
    },
  ]);

  // When and how it was handed in: the status row's, or with the submission
  // once the status row shows the grade.
  const submittedTitle = isLateSubmission ? t('submittedLate') : t('submitted');
  const submittedTime = submitTime
    ? dayjs(submitTime).format(
        isLateSubmission ? t('submittedLateAtFormat') : t('submittedAtFormat'),
      )
    : undefined;
  const submittedIcon = isLateSubmission ? 'submittedLate' : 'done';

  const submittedText = removeTags(submittedContent);
  const gradeText = removeTags(gradeContent);
  const answerText = removeTags(answerContent);

  return (
    <FormScreen testID="assignment-detail" collapsable={false}>
      <Form>
        <FormSection>
          <FormTitle
            title={title}
            subtitle={[
              completionType === HomeworkCompletionType.GROUP
                ? t('assignmentGroupCompletion')
                : t('assignmentIndividualCompletion'),
              submissionType === HomeworkSubmissionType.OFFLINE
                ? t('assignmentOfflineSubmission')
                : t('assignmentOnlineSubmission'),
            ].join(' · ')}
          />
        </FormSection>
        <FormSection>
          <FormText
            title={t('deadline')}
            subtitle={dayjs(deadline).format(t('fullDateTimeFormat'))}
            detail={deadlineText(deadline, now)}
            detailTint={urgency && deadlineTone[urgency]}
            icon="deadline"
          />
          {lateSubmissionDeadline ? (
            <FormText
              title={t('lateSubmission')}
              subtitle={dayjs(lateSubmissionDeadline).format(
                t('fullDateTimeFormat'),
              )}
              icon="lateSubmission"
            />
          ) : null}
          {graded ? (
            <FormText
              title={t('grade')}
              subtitle={dayjs(gradeTime).format(
                graderName
                  ? t('gradedByAtFormat', {
                      grader: formatLiteral(graderName),
                    })
                  : t('gradedAtFormat'),
              )}
              detail={
                gradeLevel
                  ? getAssignmentGradeLevelDescription(gradeLevel)
                  : grade !== undefined
                    ? String(grade)
                    : t('graded')
              }
              detailTint="accent"
              icon="grade"
            />
          ) : (
            <FormText
              title={submitted ? submittedTitle : t('notSubmitted')}
              subtitle={submitted ? submittedTime : undefined}
              icon={
                submitted
                  ? submittedIcon
                  : !closed
                    ? 'unfinished'
                    : lateOpen
                      ? 'lateSubmission'
                      : 'missed'
              }
            />
          )}
          {hasDraft ? (
            <FormLink
              title={t('unsentDraft')}
              icon="edit"
              onPress={handleSubmit}
            />
          ) : null}
        </FormSection>
        <FormSection title={t('description')}>
          {hasDescription ? (
            <FormWebView content={description ?? ''} />
          ) : !attachment ? (
            <FormParagraph text={t('noAssignmentDescription')} />
          ) : null}
          {attachment ? (
            <FormFile
              title={attachment.name}
              detail={attachment.size}
              icon="file"
              onPress={() => handleFileOpen(attachment)}
            />
          ) : null}
        </FormSection>
        {submitted && (submittedText || submittedAttachment || graded) ? (
          <FormSection title={t('yourSubmission')}>
            {graded ? (
              <FormText
                title={submittedTitle}
                subtitle={submittedTime}
                icon={submittedIcon}
              />
            ) : null}
            {submittedText ? <FormParagraph text={submittedText} /> : null}
            {submittedAttachment ? (
              <FormFile
                title={submittedAttachment.name}
                detail={submittedAttachment.size}
                icon="file"
                onPress={() => handleFileOpen(submittedAttachment)}
              />
            ) : null}
          </FormSection>
        ) : null}
        {graded && (gradeText || gradeAttachment) ? (
          <FormSection title={t('feedback')}>
            {gradeText ? <FormParagraph text={gradeText} /> : null}
            {gradeAttachment ? (
              <FormFile
                title={gradeAttachment.name}
                detail={gradeAttachment.size}
                icon="file"
                onPress={() => handleFileOpen(gradeAttachment)}
              />
            ) : null}
          </FormSection>
        ) : null}
        {answerText || answerAttachment ? (
          <FormSection title={t('answer')}>
            {answerText ? <FormParagraph text={answerText} /> : null}
            {answerAttachment ? (
              <FormFile
                title={answerAttachment.name}
                detail={answerAttachment.size}
                icon="answer"
                onPress={() => handleFileOpen(answerAttachment)}
              />
            ) : null}
          </FormSection>
        ) : null}
        {excellentHomeworkList?.length ? (
          <FormSection title={t('excellentHomework')}>
            {excellentHomeworkList.map(excellentHomework => (
              <ExcellentHomeworkRow
                key={excellentHomework.id}
                homework={excellentHomework}
                onFileOpen={handleFileOpen}
              />
            ))}
          </FormSection>
        ) : null}
      </Form>
    </FormScreen>
  );
};

export default AssignmentDetail;
