import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';
import IconText from './IconText';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import Text from './Text';
import {useDarkMode} from 'react-native-dark-mode';

export interface ICourseCardProps extends IInteractablePreviewWrapperProps {
  readonly courseName: string;
  readonly courseTeacherName: string;
  readonly noticesCount: number;
  readonly filesCount: number;
  readonly assignmentsCount: number;
  readonly semester: string;
}

const CourseCard: React.FC<ICourseCardProps> = props => {
  const {
    onPress,
    onPressIn,
    courseName,
    courseTeacherName,
    noticesCount,
    filesCount,
    assignmentsCount,
    semester,
    pinned,
    onPinned,
  } = props;

  const isDarkMode = useDarkMode();

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      onPressIn={onPressIn}
      dragEnabled={true}>
      <View
        style={{
          backgroundColor: isDarkMode ? 'black' : 'white',
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          borderLeftColor: Colors.theme,
          borderLeftWidth: pinned ? 10 : 0,
        }}>
        <Text
          style={[
            {flex: 1},
            isDarkMode ? iOSUIKit.bodyEmphasizedWhite : iOSUIKit.bodyEmphasized,
            Platform.OS === 'android' && {fontWeight: 'bold'},
          ]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {courseName}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', flex: 1}}>
          <View style={{flex: 1}}>
            <Text
              style={[
                isDarkMode ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
                {marginTop: 10},
              ]}>
              {courseTeacherName}
            </Text>
            <Text
              style={{
                color: isDarkMode ? Colors.grayDark : Colors.grayLight,
                fontSize: 13,
                marginTop: 10,
              }}>
              {semester}
            </Text>
          </View>
          <View style={[styles.flexRow, {flex: 1}]}>
            <IconText
              name="notifications"
              color={isDarkMode ? Colors.grayDark : Colors.grayLight}
              text={`${noticesCount}`}
            />
            <IconText
              name="folder"
              color={isDarkMode ? Colors.grayDark : Colors.grayLight}
              text={`${filesCount}`}
            />
            <IconText
              name="today"
              color={isDarkMode ? Colors.grayDark : Colors.grayLight}
              text={`${assignmentsCount}`}
            />
          </View>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default CourseCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
