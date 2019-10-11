import React, {FunctionComponent} from 'react';
import {
  Platform,
  ScrollView,
  TouchableHighlightProps,
  View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getLocale, getTranslation} from '../helpers/i18n';
import {getExtension, shareFile, stripExtension} from '../helpers/share';
import {showToast} from '../helpers/toast';
import AutoHeightWebView from './AutoHeightWebView';
import Divider from './Divider';
import Text from './Text';
import TextButton from './TextButton';
import {useDarkMode} from 'react-native-dark-mode';

export type IAssignmentBoardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly deadline: string;
  readonly description?: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly submittedAttachmentName?: string;
  readonly submittedAttachmentUrl?: string;
  readonly submitTime?: string;
  readonly grade?: number;
  readonly gradeLevel?: string;
  readonly componentId: string;
  readonly gradeContent?: string;
  readonly onTransition?: () => void;
};

declare const preval: any;

const darkreader = preval`
  const fs = require('fs')
  module.exports = fs.readFileSync(require.resolve('../../node_modules/darkreader/darkreader.js'), 'utf8')
`;

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
    onTransition,
  } = props;

  const onAttachmentPress = async (
    filename: string,
    url: string,
    ext: string,
  ) => {
    if (onTransition) {
      onTransition();
    }

    if (Platform.OS === 'ios') {
      Navigation.push(componentId, {
        component: {
          name: 'webview',
          passProps: {
            filename: stripExtension(filename),
            url,
            ext,
            pushed: true,
          },
          options: {
            topBar: {
              title: {
                component: {
                  name: 'navigation.title',
                  passProps: {
                    pushed: true,
                    children: stripExtension(filename),
                    style: {
                      fontSize: 17,
                      fontWeight: '500',
                      color: isDarkMode ? 'white' : 'black',
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      showToast(getTranslation('downloadingFile'), 1000);
      const success = await shareFile(url, stripExtension(filename), ext);
      if (!success) {
        showToast(getTranslation('downloadFileFailure'), 3000);
      }
    }
  };

  const isDarkMode = useDarkMode();

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
              color={isDarkMode ? Colors.purpleDark : Colors.theme}
            />
            <TextButton
              textStyle={{color: isDarkMode ? Colors.purpleDark : Colors.theme}}
              // tslint:disable-next-line: jsx-no-lambda
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
              color={isDarkMode ? Colors.purpleDark : Colors.theme}
            />
            <TextButton
              textStyle={{color: isDarkMode ? Colors.purpleDark : Colors.theme}}
              // tslint:disable-next-line: jsx-no-lambda
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
                color={isDarkMode ? Colors.purpleDark : Colors.theme}
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
        style={{backgroundColor: 'transparent'}}
        originWhitelist={['*']}
        source={{
          html: `
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0" />
            <style>
              body {
                margin: 0;
                padding: 20px;
                ${
                  isDarkMode
                    ? 'background-color: black;'
                    : 'background-color: white;'
                }
              }
            </style>
            ${
              isDarkMode
                ? `
                <script>
              ${darkreader}
            </script>
            <script>
              DarkReader.enable();
            </script>
            `
                : ''
            }
          </head>
          <body>
            ${description || getTranslation('noAssignmentDescription')}
          </body>`,
        }}
      />
    </ScrollView>
  );
};

export default AssignmentBoard;
