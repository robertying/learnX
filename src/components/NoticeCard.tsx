import React from 'react';
import {Platform, StyleSheet, View, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {removeTags} from '../helpers/html';
import {getLocale, getTranslation} from '../helpers/i18n';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import {useColorScheme} from 'react-native-appearance';

export interface INoticeCardProps extends IInteractablePreviewWrapperProps {
  title: string;
  author: string;
  date: string;
  content?: string;
  markedImportant: boolean;
  hasAttachment: boolean;
  courseName?: string;
  courseTeacherName?: string;
}

const styles = StyleSheet.create({
  root: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
  },
  icon: {
    marginLeft: 5,
  },
});

const NoticeCard: React.FC<INoticeCardProps> = props => {
  const {
    onPress,
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
    fav,
    onFav,
    dragEnabled,
    onRemind,
  } = props;

  const colorScheme = useColorScheme();

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      fav={fav}
      onFav={onFav}
      onPress={onPress}
      onRemind={onRemind}
      dragEnabled={dragEnabled}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: Colors.system('background', colorScheme),
            borderLeftColor: Colors.system('purple', colorScheme),
            borderLeftWidth: pinned ? 10 : 0,
          },
        ]}>
        <View style={styles.flexRow}>
          <Text
            style={[
              styles.title,
              colorScheme === 'dark'
                ? iOSUIKit.bodyEmphasizedWhite
                : iOSUIKit.bodyEmphasized,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          {hasAttachment && (
            <Icon
              style={styles.icon}
              name="attachment"
              size={18}
              color={Colors.system('yellow', colorScheme)}
            />
          )}
          {markedImportant && (
            <Icon
              style={styles.icon}
              name="flag"
              size={18}
              color={Colors.system('red', colorScheme)}
            />
          )}
        </View>
        <View
          style={{
            marginTop: 8,
          }}>
          <Text
            style={
              colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead
            }
            numberOfLines={3}>
            {removeTags(content || '') || getTranslation('noNoticeContent')}
          </Text>
        </View>
        <View
          style={[
            styles.flexRow,
            {
              marginTop: 10,
            },
          ]}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flex: 1,
              color: Colors.system('gray', colorScheme),
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
              color: Colors.system('gray', colorScheme),
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
