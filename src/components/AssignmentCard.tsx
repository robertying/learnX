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

export interface IAssignmentCardProps extends IInteractablePreviewWrapperProps {
  readonly title: string;
  readonly hasAttachment: boolean;
  readonly submitted: boolean;
  readonly graded: boolean;
  readonly date: string;
  readonly description?: string;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
}

const AssignmentCard: React.FC<IAssignmentCardProps> = props => {
  const {
    onPress,
    onPressIn,
    title,
    hasAttachment,
    date,
    courseName,
    courseTeacherName,
    description,
    pinned,
    onPinned,
    submitted,
    graded,
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
          {submitted && (
            <Icon
              style={{marginLeft: 5}}
              name="done"
              size={18}
              color={isDarkMode ? Colors.greenDark : Colors.greenLight}
            />
          )}
          {graded && (
            <Icon
              style={{marginLeft: 5}}
              name="grade"
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
            {removeTags(description || '') ||
              getTranslation('noAssignmentDescription')}
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
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flex: 1,
              color: isDarkMode ? Colors.grayDark : Colors.grayLight,
              fontSize: 13,
            }}>
            {courseName &&
              courseTeacherName &&
              `${courseTeacherName} / ${courseName}`}
          </Text>
          <Text
            style={{
              color: isDarkMode ? Colors.grayDark : Colors.grayLight,
              fontSize: 13,
            }}>
            {getLocale().startsWith('zh')
              ? dayjs().isAfter(dayjs(date))
                ? dayjs().to(dayjs(date)) + '截止'
                : '还剩 ' + dayjs().to(dayjs(date), true)
              : dayjs().isAfter(dayjs(date))
              ? 'closed ' + dayjs().to(dayjs(date))
              : 'due in ' + dayjs().to(dayjs(date), true)}
          </Text>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default AssignmentCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
