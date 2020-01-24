import React, {FunctionComponent, useMemo} from 'react';
import {
  ScrollView,
  TouchableHighlightProps,
  View,
  StyleSheet,
  Text,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AutoHeightWebView from '../components/AutoHeightWebView';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {getExtension, stripExtension} from '../helpers/share';
import Divider from './Divider';
import TextButton from './TextButton';
import {pushTo} from '../helpers/navigation';
import {getWebViewTemplate} from '../helpers/html';
import {useColorScheme} from 'react-native-appearance';

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

const styles = StyleSheet.create({
  root: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
  },
  status: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
});

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

  const colorScheme = useColorScheme();

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
      colorScheme === 'dark',
    );
  };

  const html = useMemo(
    () =>
      getWebViewTemplate(
        content || getTranslation('noNoticeContent'),
        colorScheme === 'dark',
      ),
    [content, colorScheme],
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <View style={styles.root}>
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
        <View style={styles.info}>
          <Text
            style={[
              iOSUIKit.body,
              {
                color: Colors.system('gray', colorScheme),
              },
            ]}>
            {author}
          </Text>
          <Text
            style={[
              iOSUIKit.body,
              {
                color: Colors.system('gray', colorScheme),
              },
            ]}>
            {dayjs(publishTime).format('LL')}
          </Text>
        </View>
      </View>
      <Divider />
      {attachmentName ? (
        <>
          <View style={styles.status}>
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
      <AutoHeightWebView
        source={{
          html,
        }}
      />
    </ScrollView>
  );
};

export default NoticeBoard;
