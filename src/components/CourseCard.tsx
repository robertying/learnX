import React from 'react';
import {Platform, StyleSheet, View, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';
import IconText from './IconText';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import {useColorScheme} from 'react-native-appearance';

export interface ICourseCardProps extends IInteractablePreviewWrapperProps {
  courseName: string;
  courseTeacherName: string;
  noticesCount: number;
  filesCount: number;
  assignmentsCount: number;
  semester: string;
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
  },
});

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

  const colorScheme = useColorScheme();

  return (
    <InteractablePreviewWrapper
      hidden={hidden}
      onHide={onHide}
      onPress={onPress}
      dragEnabled={true}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: Colors.system('background', colorScheme),
          },
        ]}>
        <Text
          style={[
            colorScheme === 'dark'
              ? iOSUIKit.bodyEmphasizedWhite
              : iOSUIKit.bodyEmphasized,
            {
              flex: 1,
              fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {courseName}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', flex: 1}}>
          <View style={{flex: 1}}>
            <Text
              style={[
                colorScheme === 'dark'
                  ? iOSUIKit.subheadWhite
                  : iOSUIKit.subhead,
                {marginTop: 10},
              ]}>
              {courseTeacherName}
            </Text>
            <Text
              style={{
                color: Colors.system('gray', colorScheme),
                fontSize: 13,
                marginTop: 10,
              }}>
              {semester}
            </Text>
          </View>
          <View style={[styles.flexRow, {flex: 1}]}>
            <IconText
              name="notifications"
              color={Colors.system('gray', colorScheme)}
              text={`${noticesCount}`}
            />
            <IconText
              name="folder"
              color={Colors.system('gray', colorScheme)}
              text={`${filesCount}`}
            />
            <IconText
              name="today"
              color={Colors.system('gray', colorScheme)}
              text={`${assignmentsCount}`}
            />
          </View>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default CourseCard;
