import { useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  ExcellentHomework,
  HomeworkCompletionType,
  HomeworkSubmissionType,
  RemoteFile,
} from '@robertying/thu-learn-lib';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import IconButton from 'components/IconButton';
import { AssignmentDetailParamList, MainStackScreenProps } from 'screens/types';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useMinute from 'hooks/useMinute';
import { getWebViewTemplate } from 'helpers/html';
import { removeTags } from 'helpers/text';
import { getExtension, stripExtension } from 'helpers/filename';
import {
  formatLiteral,
  getAssignmentGradeLevelDescription,
  t,
} from 'helpers/i18n';
import { deadlineText, isDueSoon } from 'helpers/assignments';
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
  FormSection,
  FormText,
  FormTitle,
  FormView,
  type FormRowPosition,
} from 'components/Form';
import { useTheme } from 'theme';

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
      icon={{ ios: 'medal', android: 'medal-outline' }}
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
  const theme = useTheme();

  const detailNavigator = useDetailNavigator();
  const hasDraft = useHasSubmissionDraft(assignment.id);

  const {
    id,
    courseName,
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
  const closed = dayjs(now).isAfter(dayjs(deadline));

  const html = getWebViewTemplate(
    description || `<p>${t('noAssignmentDescription')}</p>`,
    {
      dark: theme.dark,
      // The form row's own color shows through.
      backgroundColor: 'transparent',
      textColor: theme.colors.onSurfaceHigh,
      linkColor: theme.colors.primary,
    },
  );

  const handleFileOpen = (remoteFile?: RemoteFile) => {
    if (remoteFile) {
      navigation.push('FileDetail', {
        attachment: {
          id: remoteFile.id,
          courseName,
          title: stripExtension(remoteFile.name),
          downloadUrl: remoteFile.downloadUrl,
          fileType: getExtension(remoteFile.name),
        },
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

  useEffect(() => {
    if (submissionType !== HomeworkSubmissionType.OFFLINE) {
      navigation.setOptions({
        headerRight: () => (
          <IconButton
            disabled={closed}
            onPress={handleSubmit}
            accessibilityLabel={t('submit')}
            icon="upload"
          />
        ),
        unstable_headerRightItems: () => [
          {
            type: 'button',
            identifier: 'submit',
            label: t('submit'),
            icon: {
              type: 'sfSymbol',
              name: 'arrow.up.circle',
            },
            disabled: closed,
            onPress: handleSubmit,
          },
        ],
      });
    }
  }, [submissionType, closed, handleSubmit, navigation]);

  const fileIcon = { ios: 'doc', android: 'file-document-outline' } as const;
  const submittedText = removeTags(submittedContent);
  const gradeText = removeTags(gradeContent);
  const answerText = removeTags(answerContent);

  return (
    <SafeArea testID="assignment-detail" collapsable={false}>
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
            detailTint={isDueSoon(deadline, now) ? 'warning' : undefined}
            icon={{ ios: 'clock', android: 'clock-outline' }}
          />
          {lateSubmissionDeadline ? (
            <FormText
              title={t('lateSubmission')}
              subtitle={dayjs(lateSubmissionDeadline).format(
                t('fullDateTimeFormat'),
              )}
              icon={{
                ios: 'clock.badge.exclamationmark',
                android: 'clock-alert-outline',
              }}
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
              icon={{ ios: 'star', android: 'star-outline' }}
            />
          ) : (
            <FormText
              title={
                submitted
                  ? isLateSubmission
                    ? t('submittedLate')
                    : t('submitted')
                  : t('notSubmitted')
              }
              subtitle={
                submitted && submitTime
                  ? dayjs(submitTime).format(
                      isLateSubmission
                        ? t('submittedLateAtFormat')
                        : t('submittedAtFormat'),
                    )
                  : undefined
              }
              icon={
                submitted
                  ? { ios: 'checkmark.circle', android: 'check-circle-outline' }
                  : { ios: 'circle', android: 'checkbox-blank-circle-outline' }
              }
            />
          )}
          {hasDraft ? (
            <FormLink
              title={t('unsentDraft')}
              icon={{ ios: 'pencil', android: 'pencil-outline' }}
              onPress={handleSubmit}
            />
          ) : null}
        </FormSection>
        {graded && (gradeText || gradeAttachment) ? (
          <FormSection title={t('feedback')}>
            {gradeText ? <FormParagraph text={gradeText} /> : null}
            {gradeAttachment ? (
              <FormFile
                title={gradeAttachment.name}
                detail={gradeAttachment.size}
                icon={fileIcon}
                onPress={() => handleFileOpen(gradeAttachment)}
              />
            ) : null}
          </FormSection>
        ) : null}
        {submitted && (submittedText || submittedAttachment || graded) ? (
          <FormSection title={t('yourSubmission')}>
            {graded ? (
              <FormText
                title={isLateSubmission ? t('submittedLate') : t('submitted')}
                subtitle={
                  submitTime
                    ? dayjs(submitTime).format(
                        isLateSubmission
                          ? t('submittedLateAtFormat')
                          : t('submittedAtFormat'),
                      )
                    : undefined
                }
                icon={{
                  ios: 'checkmark.circle',
                  android: 'check-circle-outline',
                }}
              />
            ) : null}
            {submittedText ? <FormParagraph text={submittedText} /> : null}
            {submittedAttachment ? (
              <FormFile
                title={submittedAttachment.name}
                detail={submittedAttachment.size}
                icon={fileIcon}
                onPress={() => handleFileOpen(submittedAttachment)}
              />
            ) : null}
          </FormSection>
        ) : null}
        {attachment ? (
          <FormSection title={t('attachment')}>
            <FormFile
              title={attachment.name}
              detail={attachment.size}
              icon={fileIcon}
              onPress={() => handleFileOpen(attachment)}
            />
          </FormSection>
        ) : null}
        {answerText || answerAttachment ? (
          <FormSection title={t('answer')}>
            {answerText ? <FormParagraph text={answerText} /> : null}
            {answerAttachment ? (
              <FormFile
                title={answerAttachment.name}
                detail={answerAttachment.size}
                icon={{ ios: 'key', android: 'key-variant' }}
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
        <FormSection title={t('description')}>
          <FormView>
            <AutoHeightWebView source={{ html }} />
          </FormView>
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default AssignmentDetail;
