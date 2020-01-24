import React, {FunctionComponent, useMemo} from 'react';
import {ScrollView, TouchableHighlightProps, View, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getLocale, getTranslation} from '../helpers/i18n';
import {getExtension, stripExtension} from '../helpers/share';
import AutoHeightWebView from './AutoHeightWebView';
import Divider from './Divider';
import TextButton from './TextButton';
import {pushTo} from '../helpers/navigation';
import {IFilePreviewScreenProps} from '../screens/FilePreviewScreen';
import {getWebViewTemplate} from '../helpers/html';
import {useColorScheme} from 'react-native-appearance';

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

  const colorScheme = useColorScheme();

  const onAttachmentPress = (filename: string, url: string, ext: string) => {
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
      <View
        style={{
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
        }}>
        <Text
          style={[
            colorScheme === 'dark'
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
              color={Colors.system('purple', colorScheme)}
            />
            <TextButton
              textStyle={{
                color: Colors.system('purple', colorScheme),
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
              color={Colors.system('purple', colorScheme)}
            />
            <TextButton
              textStyle={{
                color: Colors.system('purple', colorScheme),
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
      {grade || gradeLevel || gradeContent ? (
        <>
          <View style={{padding: 15, paddingLeft: 20, paddingRight: 20}}>
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
                  marginTop: 5,
                  color: Colors.system('foreground', colorScheme),
                }}>
                {gradeContent}
              </Text>
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
