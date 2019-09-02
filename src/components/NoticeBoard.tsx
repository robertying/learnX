import React, {FunctionComponent} from 'react';
import {
  Platform,
  ScrollView,
  TouchableHighlightProps,
  View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {iOSColors, iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AutoHeightWebView from '../components/AutoHeightWebView';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {getExtension, shareFile, stripExtension} from '../helpers/share';
import {showToast} from '../helpers/toast';
import Divider from './Divider';
import Text from './Text';
import TextButton from './TextButton';

export type INoticeBoardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly author: string;
  readonly content?: string;
  readonly publishTime: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly componentId: string;
  readonly onTransition?: () => void;
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
          },
          options: {
            topBar: {
              title: {
                text: stripExtension(filename),
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

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#fff',
      }}>
      <View style={{padding: 15, paddingLeft: 20, paddingRight: 20}}>
        <Text
          style={[iOSUIKit.title3Emphasized, {lineHeight: 24}]}
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
          <Text style={[iOSUIKit.body, {color: iOSColors.gray}]}>{author}</Text>
          <Text style={[iOSUIKit.body, {color: iOSColors.gray}]}>
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
              color={Colors.theme}
            />
            <TextButton
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
      <AutoHeightWebView
        style={{margin: 15}}
        originWhitelist={['*']}
        source={{
          html: `<head><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0"/></head><body>${content ||
            getTranslation('noNoticeContent')}</body>`,
        }}
      />
    </ScrollView>
  );
};

export default NoticeBoard;
