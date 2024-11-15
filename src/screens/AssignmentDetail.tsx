import {useCallback, useLayoutEffect, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {
  Caption,
  Divider,
  Title,
  useTheme,
  Text,
  IconButton,
  Chip,
} from 'react-native-paper';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import dayjs from 'dayjs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  HomeworkCompletionType,
  HomeworkSubmissionType,
  RemoteFile,
} from 'thu-learn-lib';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import Styles from 'constants/Styles';
import {AssignmentStackParams} from 'screens/types';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {getWebViewTemplate, removeTags} from 'helpers/html';
import {getExtension, stripExtension} from 'helpers/fs';
import {
  getAssignmentGradeLevelDescription,
  isLocaleChinese,
  t,
} from 'helpers/i18n';
import {File} from 'data/types/state';

type Props = NativeStackScreenProps<AssignmentStackParams, 'AssignmentDetail'>;

const AssignmentDetail: React.FC<Props> = ({route, navigation}) => {
  const theme = useTheme();

  const detailNavigator = useDetailNavigator();

  const {
    courseName,
    title,
    deadline,
    description,
    completionType,
    submissionType,
    attachment,
    submitted,
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
    disableAnimation,
  } = route.params;

  const html = useMemo(
    () =>
      getWebViewTemplate(
        description || `<p>${t('noAssignmentDescription')}</p>`,
        theme.dark,
        theme.colors.surface,
      ),
    [description, theme],
  );

  const handleFileOpen = (attachment?: RemoteFile) => {
    if (attachment) {
      const data = {
        id: attachment.id,
        courseName,
        title: stripExtension(attachment.name),
        downloadUrl: attachment.downloadUrl,
        fileType: getExtension(attachment.name) ?? '',
      } as File;

      navigation.push('FileDetail', data);
    }
  };

  const handleSubmit = useCallback(() => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.push('AssignmentSubmission', route.params),
      );
    } else {
      navigation.navigate('AssignmentSubmissionStack', {
        screen: 'AssignmentSubmission',
        params: route.params,
      } as any);
    }
  }, [detailNavigator, navigation, route.params]);

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);

  useLayoutEffect(() => {
    if (submissionType !== HomeworkSubmissionType.OFFLINE) {
      navigation.setOptions({
        headerRight: () => (
          <IconButton
            style={{marginRight: -8}}
            disabled={dayjs().isAfter(dayjs(deadline))}
            onPress={handleSubmit}
            icon={props => <MaterialIcons {...props} name="file-upload" />}
          />
        ),
      });
    }
  }, [deadline, handleSubmit, navigation]);

  return (
    <SafeArea>
      <ScrollView style={{backgroundColor: theme.colors.surface}}>
        <View style={styles.section}>
          <View style={Styles.flexRow}>
            <Chip compact mode="outlined" style={styles.chip}>
              {completionType === HomeworkCompletionType.GROUP
                ? t('assignmentGroupCompletion')
                : t('assignmentIndividualCompletion')}
            </Chip>
            <Chip compact mode="outlined" style={styles.chip}>
              {submissionType === HomeworkSubmissionType.OFFLINE
                ? t('assignmentOfflineSubmission')
                : t('assignmentOnlineSubmission')}
            </Chip>
          </View>
          <Title>{title}</Title>
          <View style={Styles.flexRowCenter}>
            <Caption>
              {isLocaleChinese()
                ? dayjs().isAfter(dayjs(deadline))
                  ? dayjs().to(dayjs(deadline)) + '截止'
                  : '还剩 ' + dayjs().to(dayjs(deadline), true)
                : dayjs().isAfter(dayjs(deadline))
                  ? 'closed ' + dayjs().to(dayjs(deadline))
                  : 'due in ' + dayjs().to(dayjs(deadline), true)}
            </Caption>
            <Caption>
              {dayjs(deadline).format(
                isLocaleChinese()
                  ? 'YYYY 年 M 月 D 日 dddd HH:mm'
                  : 'ddd, MMM D, YYYY HH:mm',
              )}
            </Caption>
          </View>
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
                onPress={() => handleFileOpen(attachment)}>
                {attachment.name}
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
                    onPress={() => handleFileOpen(submittedAttachment)}>
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
                        isLocaleChinese()
                          ? 'YYYY 年 M 月 D 日 dddd HH:mm 提交'
                          : '[submitted at] HH:mm, MMM D, YYYY',
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
              <MaterialIcons
                style={styles.icon}
                name="grade"
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
                    onPress={() => handleFileOpen(gradeAttachment)}>
                    {gradeAttachment.name}
                  </TextButton>
                )}
                {removeTags(gradeContent) ? (
                  <Text style={Styles.spacey1}>{removeTags(gradeContent)}</Text>
                ) : null}
                <Caption>
                  {dayjs(gradeTime).format(
                    isLocaleChinese()
                      ? graderName
                        ? `YYYY 年 M 月 D 日 dddd HH:mm 由${graderName}批改`
                        : 'YYYY 年 M 月 D 日 dddd HH:mm 批改'
                      : graderName
                        ? `[graded by ${graderName} at] HH:mm, MMM D, YYYY`
                        : '[graded at] HH:mm, MMM D, YYYY',
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
                    onPress={() => handleFileOpen(answerAttachment)}>
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
