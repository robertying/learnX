import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {iOSColors, iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';
import IconText from './IconText';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import Text from './Text';

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

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      onPressIn={onPressIn}
      dragEnabled={true}>
      <View
        style={{
          backgroundColor: '#fff',
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          borderLeftColor: Colors.theme,
          borderLeftWidth: pinned ? 10 : 0,
        }}>
        <Text
          style={[
            {flex: 1},
            iOSUIKit.bodyEmphasized,
            Platform.OS === 'android' && {fontWeight: 'bold'},
          ]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {courseName}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', flex: 1}}>
          <View style={{flex: 1}}>
            <Text style={[iOSUIKit.subhead, {marginTop: 10}]}>
              {courseTeacherName}
            </Text>
            <Text style={{color: iOSColors.gray, fontSize: 13, marginTop: 10}}>
              {semester}
            </Text>
          </View>
          <View style={[styles.flexRow, {flex: 1}]}>
            <IconText
              name="notifications"
              color="grey"
              text={`${noticesCount}`}
            />
            <IconText name="folder" color="grey" text={`${filesCount}`} />
            <IconText name="today" color="grey" text={`${assignmentsCount}`} />
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
