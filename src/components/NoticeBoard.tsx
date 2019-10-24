import React, {FunctionComponent, useMemo} from 'react';
import {ScrollView, TouchableHighlightProps, View} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AutoHeightWebView from '../components/AutoHeightWebView';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {getExtension, stripExtension} from '../helpers/share';
import Divider from './Divider';
import Text from './Text';
import TextButton from './TextButton';
import {useDarkMode} from 'react-native-dark-mode';
import {pushTo} from '../helpers/navigation';
import {getWebViewTemplate} from '../helpers/html';

export type INoticeBoardProps = TouchableHighlightProps & {
  title: string;
  author: string;
  content?: string;
  publishTime: string;
  attachmentName?: string;
  attachmentUrl?: string;
  componentId: string;
  beforeNavigation?: () => void;
};

const NoticeBoard: FunctionComponent<INoticeBoardProps> = props => {
  const {
    title,
    author,
    content,
    attachmentName,
    attachmentUrl,
    publishTime,
    componentId,
    beforeNavigation,
  } = props;

  const onAttachmentPress = async (
    filename: string,
    url: string,
    ext: string,
  ) => {
    if (beforeNavigation) {
      beforeNavigation();
    }

    const stripedFilename = stripExtension(filename);
    pushTo(
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
        content || getTranslation('noNoticeContent'),
        isDarkMode,
      ),
    [content, isDarkMode],
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 5,
          }}>
          <Text
            style={[
              iOSUIKit.body,
              {color: isDarkMode ? Colors.grayDark : Colors.grayLight},
            ]}>
            {author}
          </Text>
          <Text
            style={[
              iOSUIKit.body,
              {color: isDarkMode ? Colors.grayDark : Colors.grayLight},
            ]}>
            {dayjs(publishTime).format('LL')}
          </Text>
        </View>
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
      <AutoHeightWebView
        source={{
          html,
        }}
      />
    </ScrollView>
  );
};

export default NoticeBoard;
