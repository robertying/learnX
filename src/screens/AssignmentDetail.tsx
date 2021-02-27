import React, {useCallback, useEffect, useLayoutEffect, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {
  Caption,
  Divider,
  Title,
  useTheme,
  Text,
  IconButton,
} from 'react-native-paper';
import {StackScreenProps} from '@react-navigation/stack';
import dayjs from 'dayjs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TextButton from 'components/TextButton';
import AutoHeightWebView from 'components/AutoHeightWebView';
import SafeArea from 'components/SafeArea';
import Styles from 'constants/Styles';
import {ScreenParams} from 'screens/types';
import {getWebViewTemplate, removeTags} from 'helpers/html';
import {getExtension, stripExtension} from 'helpers/fs';
import {File} from 'data/types/state';
import DeviceInfo from 'constants/DeviceInfo';

const AssignmentDetail: React.FC<
  StackScreenProps<ScreenParams, 'AssignmentDetail'>
> = ({route, navigation}) => {
  const theme = useTheme();

  const {
    id,
    courseName,
    title,
    deadline,
    description,
    attachmentName,
    attachmentUrl,
    submitted,
    submitTime,
    submittedAttachmentName,
    submittedAttachmentUrl,
    submittedContent,
    graded,
    gradeTime,
    grade,
    gradeLevel,
    gradeAttachmentName,
    gradeAttachmentUrl,
    gradeContent,
    answerAttachmentName,
    answerAttachmentUrl,
    answerContent,
    disableAnimation,
  } = route.params;

  const html = useMemo(
    () =>
      getWebViewTemplate(
        description || '无作业描述',
        theme.dark,
        theme.colors.surface,
      ),
    [description, theme],
  );

  const handleFileOpen = (name?: string, url?: string) => {
    if (name && url) {
      const data = {
        id,
        courseName,
        title: stripExtension(name),
        downloadUrl: url,
        fileType: getExtension(name) ?? '',
      } as File;

      navigation.push('FileDetail', data);
    }
  };

  const handleSubmit = useCallback(() => {
    navigation.navigate('AssignmentSubmission', {
      screen: 'AssignmentSubmission',
      params: route.params,
    } as any);
  }, [navigation, route.params]);

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animationEnabled: false,
      });
    }
  }, [navigation, disableAnimation]);

  useEffect(() => {
    if (!DeviceInfo.isMac() && dayjs().isBefore(dayjs(deadline))) {
      navigation.setOptions({
        headerRight: () => (
          <IconButton
            onPress={handleSubmit}
            icon={(props) => <MaterialIcons {...props} name="file-upload" />}
          />
        ),
      });
    }
  }, [deadline, handleSubmit, navigation]);

  return (
    <SafeArea>
      <ScrollView style={{backgroundColor: theme.colors.surface}}>
        <View style={styles.section}>
          <Title>{title}</Title>
          <View style={Styles.flexRowCenter}>
            <Caption>
              {dayjs().isAfter(dayjs(deadline))
                ? dayjs().to(dayjs(deadline)) + '截止'
                : '还剩 ' + dayjs().to(dayjs(deadline), true)}
            </Caption>
            <Caption>
              {dayjs(deadline).format('YYYY 年 M 月 D 日 dddd HH:mm')}
            </Caption>
          </View>
        </View>
        <Divider />
        {attachmentName && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="attachment"
                color={theme.colors.primary}
                size={17}
              />
              <TextButton
                onPress={() => handleFileOpen(attachmentName, attachmentUrl)}>
                {attachmentName}
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
                {submittedAttachmentName && (
                  <TextButton
                    style={Styles.spacey1}
                    onPress={() =>
                      handleFileOpen(
                        submittedAttachmentName,
                        submittedAttachmentUrl,
                      )
                    }>
                    {submittedAttachmentName}
                  </TextButton>
                )}
                {removeTags(submittedContent) ? (
                  <Text style={Styles.spacey1}>
                    {removeTags(submittedContent)}
                  </Text>
                ) : null}
                <Caption>
                  {dayjs(submitTime).format(
                    'YYYY 年 M 月 D 日 dddd HH:mm 提交',
                  )}
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
                  <Text style={Styles.spacey1}>{gradeLevel || grade}</Text>
                ) : null}
                {gradeAttachmentName && (
                  <TextButton
                    style={Styles.spacey1}
                    onPress={() =>
                      handleFileOpen(gradeAttachmentName, gradeAttachmentUrl)
                    }>
                    {gradeAttachmentName}
                  </TextButton>
                )}
                {removeTags(gradeContent) ? (
                  <Text style={Styles.spacey1}>{removeTags(gradeContent)}</Text>
                ) : null}
                <Caption>
                  {dayjs(gradeTime).format('YYYY 年 M 月 D 日 dddd HH:mm 批改')}
                </Caption>
              </View>
            </View>
            <Divider />
          </>
        )}
        {(answerAttachmentName || answerContent) && (
          <>
            <View style={[styles.section, styles.iconButton]}>
              <MaterialCommunityIcons
                style={styles.icon}
                name="key-variant"
                color={theme.colors.primary}
                size={17}
              />
              <View style={Styles.flex1}>
                {answerAttachmentName && (
                  <TextButton
                    style={Styles.spacey1}
                    onPress={() =>
                      handleFileOpen(answerAttachmentName, answerAttachmentUrl)
                    }>
                    {answerAttachmentName}
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
  icon: {
    marginRight: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AssignmentDetail;
