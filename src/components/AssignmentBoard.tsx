import React, {FunctionComponent, useMemo} from 'react';
import {ScrollView, TouchableHighlightProps, View} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getLocale, getTranslation} from '../helpers/i18n';
import {getExtension, stripExtension} from '../helpers/share';
import AutoHeightWebView from './AutoHeightWebView';
import Divider from './Divider';
import Text from './Text';
import TextButton from './TextButton';
import {useDarkMode} from 'react-native-dark-mode';
import {pushTo} from '../helpers/navigation';
import {IWebViewScreenProps} from '../screens/WebViewScreen';
import {getWebViewTemplate} from '../helpers/html';

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
  beforeNavigation?: () => void;
};

const AssignmentBoard: FunctionComponent<IAssignmentBoardProps> = props => {
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
  } = props;

  const onAttachmentPress = (filename: string, url: string, ext: string) => {
    if (beforeNavigation) {
      beforeNavigation();
    }

    const stripedFilename = stripExtension(filename);
    pushTo<IWebViewScreenProps>(
      'webview',
      componentId,
      {
        filename: stripedFilename,
        url,
        ext,
      },
      stripedFilename,
      true,
    );
  };

  const isDarkMode = useDarkMode();

  const html = useMemo(
    () =>
      getWebViewTemplate(
        description || getTranslation('noAssignmentDescription'),
        isDarkMode,
      ),
    [description, isDarkMode],
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <View
        style={{
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
        }}>
        <Text
          style={[
            isDarkMode
              ? iOSUIKit.title3EmphasizedWhite
              : iOSUIKit.title3Emphasized,
            {lineHeight: 24},
          ]}
          numberOfLines={2}
          ellipsizeMode="tail">
          {title}
        </Text>
        <Text
          style={[
            iOSUIKit.body,
            {
              color: isDarkMode ? Colors.grayDark : Colors.grayLight,
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
          <View
            style={{
              padding: 15,
              paddingLeft: 20,
              paddingRight: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <Icon
              style={{marginRight: 5}}
              name="attachment"
              size={18}
              color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
            />
            <TextButton
              textStyle={{
                color: isDarkMode ? Colors.purpleDark : Colors.purpleLight,
              }}
              onPress={() =>
                onAttachmentPress(
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
          <View
            style={{
              padding: 15,
              paddingLeft: 20,
              paddingRight: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <Icon
              style={{marginRight: 5}}
              name="done"
              size={18}
              color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
            />
            <TextButton
              textStyle={{
                color: isDarkMode ? Colors.purpleDark : Colors.purpleLight,
              }}
              onPress={() =>
                onAttachmentPress(
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
      {grade || gradeLevel ? (
        <>
          <View style={{padding: 15, paddingLeft: 20, paddingRight: 20}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon
                style={{marginRight: 5}}
                name="grade"
                size={18}
                color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
              />
              <Text>
                {grade && gradeLevel
                  ? `${gradeLevel} / ${grade}`
                  : grade
                  ? grade
                  : gradeLevel}
              </Text>
            </View>
            {gradeContent ? (
              <Text style={{marginTop: 5}}>{gradeContent}</Text>
            ) : null}
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
