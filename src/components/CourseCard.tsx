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
  courseName: string;
  courseTeacherName: string;
  noticesCount: number;
  filesCount: number;
  assignmentsCount: number;
  semester: string;
}

const CourseCard: React.FC<ICourseCardProps> = props => {
  const {
    onPress,
    courseName,
    courseTeacherName,
    noticesCount,
    filesCount,
    assignmentsCount,
    semester,
    hidden,
    onHide,
  } = props;

  const isDarkMode = useDarkMode();

  return (
    <InteractablePreviewWrapper
      hidden={hidden}
      onHide={onHide}
      onPress={onPress}
      dragEnabled={true}>
      <View
        style={{
          backgroundColor: isDarkMode ? 'black' : 'white',
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
        }}>
        <Text
          style={StyleSheet.compose(
            isDarkMode ? iOSUIKit.bodyEmphasizedWhite : iOSUIKit.bodyEmphasized,
            {
              flex: 1,
              fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
            },
          )}
          numberOfLines={1}
          ellipsizeMode="tail">
          {courseName}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', flex: 1}}>
          <View style={{flex: 1}}>
            <Text
              style={StyleSheet.compose(
                isDarkMode ? iOSUIKit.subheadWhite : iOSUIKit.subhead,
                {marginTop: 10},
              )}>
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
