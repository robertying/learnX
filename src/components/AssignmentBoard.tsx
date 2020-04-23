import React, {FunctionComponent, useMemo} from 'react';
import {
  ScrollView,
  TouchableHighlightProps,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getLocale, getTranslation} from '../helpers/i18n';
import {getExtension, stripExtension} from '../helpers/fs';
import AutoHeightWebView from './AutoHeightWebView';
import Divider from './Divider';
import TextButton from './TextButton';
import {pushTo} from '../helpers/navigation';
import {IFilePreviewScreenProps} from '../screens/FilePreviewScreen';
import {getWebViewTemplate} from '../helpers/html';
import {useColorScheme} from 'react-native-appearance';
import {
  Navigation,
  OptionsModalPresentationStyle,
} from 'react-native-navigation';
import {IAssignmentSubmitScreenProps} from '../screens/AssignmentSubmitScreen';
import DeviceInfo from '../constants/DeviceInfo';

export type IAssignmentBoardProps = TouchableHighlightProps & {
  title: string;
  deadline: string;
  description?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  submittedAttachmentName?: string;
  submittedAttachmentUrl?: string;
  submitTime?: string;
  grade?: number;
  gradeLevel?: string;
  componentId: string;
  gradeContent?: string;
  gradeAttachmentName?: string;
  gradeAttachmentUrl?: string;
  studentHomeworkId: string;
  submittedContent?: string;
  beforeNavigation?: () => void;
  courseName: string;
};

const styles = StyleSheet.create({
  padding: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
  },
  row: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const AssignmentBoard: FunctionComponent<IAssignmentBoardProps> = (props) => {
  const {
    title,
    deadline,
    description,
    attachmentName,
    attachmentUrl,
    submitTime,
    submittedAttachmentName,
    submittedAttachmentUrl,
    grade,
    gradeContent,
    gradeLevel,
    componentId,
    beforeNavigation,
    studentHomeworkId,
    submittedContent,
    courseName,
    gradeAttachmentName,
    gradeAttachmentUrl,
  } = props;

  const colorScheme = useColorScheme();

  const onAttachmentPress = (
    courseName: string,
    filename: string,
    url: string,
    ext: string,
  ) => {
    if (beforeNavigation) {
      beforeNavigation();
    }

    const stripedFilename = stripExtension(filename);
    pushTo<IFilePreviewScreenProps>(
      'webview',
      componentId,
      {
        filename: stripedFilename,
        url,
        ext,
        courseName: `assignments/${courseName}`,
      },
      stripedFilename,
      true,
      colorScheme === 'dark',
    );
  };

  const html = useMemo(
    () =>
      getWebViewTemplate(
        description || getTranslation('noAssignmentDescription'),
        colorScheme === 'dark',
      ),
    [description, colorScheme],
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <View style={styles.padding}>
        <Text
          style={
            colorScheme === 'dark'
              ? iOSUIKit.title3EmphasizedWhite
              : iOSUIKit.title3Emphasized
          }>
          {title}
        </Text>
        <Text
          style={[
            iOSUIKit.body,
            {
              color: Colors.system('gray', colorScheme),
              marginTop: 5,
            },
          ]}>
          {getLocale().startsWith('zh')
            ? dayjs(deadline).format('llll') + ' 截止'
            : 'Submission close on ' + dayjs(deadline).format('llll')}
        </Text>
      </View>
      <Divider />
      {attachmentName ? (
        <>
          <View style={styles.row}>
            <Icon
              style={{marginRight: 5}}
              name="attachment"
              size={18}
              color={Colors.system('purple', colorScheme)}
            />
            <TextButton
              textStyle={{
                color: Colors.system('purple', colorScheme),
              }}
              onPress={() =>
                onAttachmentPress(
                  courseName,
                  attachmentName,
                  attachmentUrl!,
                  getExtension(attachmentName)!,
                )
              }
              ellipsizeMode="tail">
              {attachmentName}
            </TextButton>
          </View>
          <Divider />
        </>
      ) : null}
      {submitTime ? (
        <>
          <View style={styles.row}>
            <Icon
              style={{marginRight: 5}}
              name="done"
              size={18}
              color={Colors.system('purple', colorScheme)}
            />
            <TextButton
              textStyle={{
                color: Colors.system('purple', colorScheme),
              }}
              onPress={() =>
                onAttachmentPress(
                  courseName,
                  submittedAttachmentName!,
                  submittedAttachmentUrl!,
                  getExtension(submittedAttachmentName!)!,
                )
              }
              ellipsizeMode="tail">
              {submittedAttachmentName!}
            </TextButton>
          </View>
          <Divider />
        </>
      ) : null}
      {!DeviceInfo.isMac() && dayjs().isBefore(dayjs(deadline)) && (
        <>
          <View style={styles.row}>
            <Icon
              style={{marginRight: 5}}
              name="file-upload"
              size={18}
              color={Colors.system('purple', colorScheme)}
            />
            <TextButton
              textStyle={{
                color: Colors.system('purple', colorScheme),
              }}
              onPress={() =>
                Navigation.showModal<IAssignmentSubmitScreenProps>({
                  component: {
                    name: 'assignment.submit',
                    passProps: {
                      studentHomeworkId,
                      submittedAttachmentName,
                      submittedContent,
                    },
                    options: {
                      modalPresentationStyle:
                        OptionsModalPresentationStyle.fullScreen,
                    },
                  },
                })
              }
              ellipsizeMode="tail">
              {getTranslation('submitAssignment')}
            </TextButton>
          </View>
          <Divider />
        </>
      )}
      {grade ||
      gradeLevel ||
      gradeContent ||
      (gradeAttachmentName && gradeAttachmentUrl) ? (
        <>
          <View style={styles.padding}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon
                style={{marginRight: 5}}
                name="grade"
                size={18}
                color={Colors.system('purple', colorScheme)}
              />
              <Text style={{color: Colors.system('foreground', colorScheme)}}>
                {grade && gradeLevel
                  ? `${gradeLevel} / ${grade}`
                  : grade
                  ? grade
                  : gradeLevel
                  ? gradeLevel
                  : getTranslation('noGrade')}
              </Text>
            </View>
            {gradeContent && (
              <Text
                style={{
                  marginVertical: 5,
                  color: Colors.system('foreground', colorScheme),
                }}>
                {gradeContent}
              </Text>
            )}
            {gradeAttachmentName && gradeAttachmentUrl && (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon
                  style={{marginRight: 5}}
                  name="question-answer"
                  size={18}
                  color={Colors.system('purple', colorScheme)}
                />
                <TextButton
                  textStyle={{
                    color: Colors.system('purple', colorScheme),
                  }}
                  onPress={() =>
                    onAttachmentPress(
                      courseName,
                      gradeAttachmentName!,
                      gradeAttachmentUrl!,
                      getExtension(gradeAttachmentName!)!,
                    )
                  }
                  ellipsizeMode="tail">
                  {gradeAttachmentName!}
                </TextButton>
              </View>
            )}
          </View>
          <Divider />
        </>
      ) : null}
      <AutoHeightWebView
        source={{
          html,
        }}
      />
    </ScrollView>
  );
};

export default AssignmentBoard;
