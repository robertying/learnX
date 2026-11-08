import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Chip from 'components/Chip';
import dayjs from 'dayjs';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {
  HomeworkCompletionType,
  HomeworkSubmissionType,
  RemoteFile,
} from 'thu-learn-lib';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import IconButton from 'components/IconButton';
import ScrollView from 'components/ScrollView';
import Styles from 'constants/Styles';
import { AssignmentDetailParamList, MainStackScreenProps } from 'screens/types';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useMinute from 'hooks/useMinute';
import { getWebViewTemplate, removeTags } from 'helpers/html';
import { getExtension, stripExtension } from 'helpers/fs';
import {
  formatLiteral,
  getAssignmentGradeLevelDescription,
  t,
} from 'helpers/i18n';
import { deadlineText } from 'helpers/assignments';
import { Assignment } from 'data/types/state';
import { useAssignment } from 'data/content';
import { useHasSubmissionDraft } from 'data/submissionDrafts';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import { Caption, Text, Title } from 'components/Text';
import Divider from 'components/Divider';
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
      backgroundColor: theme.colors.surface,
      textColor: theme.colors.onSurfaceHigh,
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
          fileType: getExtension(remoteFile.name) ?? '',
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
            icon={props => (
              <MaterialCommunityIcons {...props} name="file-upload" />
            )}
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

  return (
    <SafeArea testID="assignment-detail" collapsable={false}>
      <ScrollView style={{ backgroundColor: theme.colors.surface }}>
        <View style={styles.section}>
          <View style={Styles.flexRow}>
            <Chip style={styles.chip}>
              {completionType === HomeworkCompletionType.GROUP
                ? t('assignmentGroupCompletion')
                : t('assignmentIndividualCompletion')}
            </Chip>
            <Chip style={styles.chip}>
              {submissionType === HomeworkSubmissionType.OFFLINE
                ? t('assignmentOfflineSubmission')
                : t('assignmentOnlineSubmission')}
            </Chip>
          </View>
          <Title>{title}</Title>
          <View style={Styles.flexRowCenter}>
            <Caption>{deadlineText(deadline, now)}</Caption>
            <Caption>{dayjs(deadline).format(t('fullDateTimeFormat'))}</Caption>
          </View>
          {lateSubmissionDeadline && (
            <Caption style={Styles.flexRowCenter}>
              {dayjs(lateSubmissionDeadline).format(
                t('lateSubmissionDeadlineFormat'),
              )}
            </Caption>
          )}
        </View>
        <Divider />
        {attachment && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="attachment"
                color={theme.colors.primary}
                size={17}
              />
              <TextButton
                style={styles.textPaddingRight}
                onPress={() => handleFileOpen(attachment)}
              >
                {attachment.name}
              </TextButton>
            </View>
            <Divider />
          </>
        )}
        {hasDraft && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="pencil-outline"
                color={theme.colors.primary}
                size={17}
              />
              <TextButton
                style={styles.textPaddingRight}
                onPress={handleSubmit}
              >
                {t('assignmentDraft')}
              </TextButton>
            </View>
            <Divider />
          </>
        )}
        {submitted && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="check"
                color={theme.colors.primary}
                size={17}
              />
              <View style={Styles.flex1}>
                {submittedAttachment && (
                  <TextButton
                    style={[Styles.spacey1, styles.textPaddingRight]}
                    onPress={() => handleFileOpen(submittedAttachment)}
                  >
                    {submittedAttachment.name}
                  </TextButton>
                )}
                {removeTags(submittedContent) ? (
                  <Text style={Styles.spacey1}>
                    {removeTags(submittedContent)}
                  </Text>
                ) : null}
                <Caption>
                  {submitTime
                    ? dayjs(submitTime).format(
                        isLateSubmission
                          ? t('submittedLateAtFormat')
                          : t('submittedAtFormat'),
                      )
                    : t('submitted')}
                </Caption>
              </View>
            </View>
            <Divider />
          </>
        )}
        {graded && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="star"
                color={theme.colors.primary}
                size={17}
              />
              <View style={Styles.flex1}>
                {gradeLevel || grade ? (
                  <Text style={Styles.spacey1}>
                    {gradeLevel
                      ? getAssignmentGradeLevelDescription(gradeLevel)
                      : grade}
                  </Text>
                ) : null}
                {gradeAttachment && (
                  <TextButton
                    style={[Styles.spacey1, styles.textPaddingRight]}
                    onPress={() => handleFileOpen(gradeAttachment)}
                  >
                    {gradeAttachment.name}
                  </TextButton>
                )}
                {removeTags(gradeContent) ? (
                  <Text style={Styles.spacey1} selectable>
                    {removeTags(gradeContent)}
                  </Text>
                ) : null}
                <Caption>
                  {dayjs(gradeTime).format(
                    graderName
                      ? t('gradedByAtFormat', {
                          grader: formatLiteral(graderName),
                        })
                      : t('gradedAtFormat'),
                  )}
                </Caption>
              </View>
            </View>
            <Divider />
          </>
        )}
        {(answerAttachment || answerContent) && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="key-variant"
                color={theme.colors.primary}
                size={17}
              />
              <View style={Styles.flex1}>
                {answerAttachment && (
                  <TextButton
                    style={[Styles.spacey1, styles.textPaddingRight]}
                    onPress={() => handleFileOpen(answerAttachment)}
                  >
                    {answerAttachment.name}
                  </TextButton>
                )}
                {removeTags(answerContent) ? (
                  <Text style={Styles.spacey1}>
                    {removeTags(answerContent)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Divider />
          </>
        )}
        {excellentHomeworkList &&
          excellentHomeworkList.map(excellentHomework => {
            const homeworkAttachment =
              excellentHomework.gradeAttachment ||
              excellentHomework.submittedAttachment;
            const authorName = excellentHomework.author.anonymous
              ? t('anonymous')
              : excellentHomework.author.name;
            return (
              <>
                <View style={[styles.section, styles.iconButton]}>
                  <MaterialCommunityIcons
                    style={styles.icon}
                    name="medal"
                    color={theme.colors.primary}
                    size={17}
                  />
                  <View style={Styles.flex1}>
                    {homeworkAttachment && (
                      <TextButton
                        style={[Styles.spacey1, styles.textPaddingRight]}
                        onPress={() => handleFileOpen(homeworkAttachment)}
                      >
                        {homeworkAttachment.name}
                      </TextButton>
                    )}
                    <Caption>
                      {t('excellentHomeworkBy', { name: authorName })}
                    </Caption>
                  </View>
                </View>
                <Divider />
              </>
            );
          })}
        <AutoHeightWebView
          source={{
            html,
          }}
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textPaddingRight: {
    paddingRight: 16,
  },
  icon: {
    marginRight: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    marginBottom: 8,
    marginRight: 8,
  },
});

export default AssignmentDetail;
