import React from 'react';
import {Alert, ScrollView, StyleSheet} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {Caption} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {useTypedSelector} from 'data/store';
import {setSetting} from 'data/actions/settings';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {ScreenParams} from './types';

const CourseX: React.FC<StackScreenProps<ScreenParams, 'CourseX'>> = (
  props,
) => {
  const dispatch = useDispatch();
  const courseInformationSharing = useTypedSelector(
    (state) => state.settings.courseInformationSharing,
  );

  const handleEnable = (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        '加入课程信息共享计划',
        '确定加入课程信息共享计划？当前学期的课程信息将会被自动上传；上传内容不包含任何个人信息。',
        [
          {
            text: '取消',
            style: 'cancel',
          },
          {
            text: '确定',
            onPress: () => {
              dispatch(setSetting('courseInformationSharing', enabled));
            },
          },
        ],
        {cancelable: true},
      );
    } else {
      dispatch(setSetting('courseInformationSharing', enabled));
    }
  };

  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="cached"
          primaryText="加入课程信息共享计划"
          switchValue={courseInformationSharing}
          onSwitchValueChange={handleEnable}
          type="switch"
        />
        <Caption style={styles.caption}>
          {courseInformationSharing
            ? '退出课程信息共享计划后，课程信息将不再自动上传。'
            : '加入课程信息共享计划后，当前学期的课程信息（包括课程号、课程名、任课教师、上课时间和地点）会自动上传至 courseX 平台，共享给其他用户。上传内容不包含任何个人信息。\n\n你还可以选择在课程页面撰写评价、上传成绩，进一步完善 courseX 课程信息数据库；除此之外，你也可以查看他人对该课程的评价，以及已上传成绩的分布情况。'}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="open-in-new"
          primaryText="课程信息共享计划 courseX"
          type="none"
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default CourseX;
