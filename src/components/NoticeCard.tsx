import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {removeTags} from '../helpers/html';
import {getLocale, getTranslation} from '../helpers/i18n';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import Text from './Text';
import {useDarkMode} from 'react-native-dark-mode';

export interface INoticeCardProps extends IInteractablePreviewWrapperProps {
  readonly title: string;
  readonly author: string;
  readonly date: string;
  readonly content?: string;
  readonly markedImportant: boolean;
  readonly hasAttachment: boolean;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
}

const NoticeCard: React.FC<INoticeCardProps> = props => {
  const {
    onPress,
    onPressIn,
    title,
    author,
    date,
    courseName,
    courseTeacherName,
    content,
    markedImportant,
    hasAttachment,
    pinned,
    onPinned,
    dragEnabled,
  } = props;

  const isDarkMode = useDarkMode();

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      onPressIn={onPressIn}
      dragEnabled={dragEnabled}>
      <View
        style={{
          backgroundColor: isDarkMode ? 'black' : 'white',
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          borderLeftColor: Colors.theme,
          borderLeftWidth: pinned ? 10 : 0,
        }}>
        <View
          style={[
            styles.flexRow,
            {
              justifyContent: 'space-between',
            },
          ]}>
          <Text
            style={[
              {flex: 1},
              isDarkMode
                ? iOSUIKit.bodyEmphasizedWhite
                : iOSUIKit.bodyEmphasized,
              Platform.OS === 'android' && {fontWeight: 'bold'},
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          {hasAttachment && (
            <Icon
              style={{marginLeft: 5}}
              name="attachment"
              size={18}
              color={isDarkMode ? Colors.yellowDark : Colors.yellowLight}
            />
          )}
          {markedImportant && (
            <Icon
              style={{marginLeft: 5}}
              name="flag"
              size={18}
              color={isDarkMode ? Colors.redDark : Colors.redLight}
            />
          )}
        </View>
        <View
          style={{
            marginTop: 8,
          }}>
          <Text
            style={isDarkMode ? iOSUIKit.subheadWhite : iOSUIKit.subhead}
            numberOfLines={3}>
            {removeTags(content || '') || getTranslation('noNoticeContent')}
          </Text>
        </View>
        <View
          style={[
            styles.flexRow,
            {
              justifyContent: 'space-between',
              marginTop: 10,
            },
          ]}>
          <Text
            style={{
              color: isDarkMode ? Colors.grayDark : Colors.grayLight,
              fontSize: 13,
            }}>
            {courseName && courseTeacherName
              ? `${courseTeacherName} / ${courseName}`
              : getLocale().startsWith('zh')
              ? author + ' 发布'
              : 'published by ' + author}
          </Text>
          <Text
            style={{
              color: isDarkMode ? Colors.grayDark : Colors.grayLight,
              fontSize: 13,
            }}>
            {dayjs(date).fromNow()}
          </Text>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default NoticeCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
