import {useEffect} from 'react';
import {Alert, Linking, ScrollView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Caption} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from 'data/store';
import {setSetting} from 'data/actions/settings';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {getLocale, t} from 'helpers/i18n';
import {uploadCourses} from 'helpers/coursex';
import {ScreenParams} from './types';

const CourseInformationSharing: React.FC<
  React.PropsWithChildren<
    NativeStackScreenProps<ScreenParams, 'CourseInformationSharing'>
  >
> = props => {
  const dispatch = useAppDispatch();

  const courses = useAppSelector(state => state.courses.items);
  const courseInformationSharing = useAppSelector(
    state => state.settings.courseInformationSharing,
  );

  const handleEnable = (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        t('joinCourseInformationSharing'),
        t('joinCourseInformationSharingConfirmation'),
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('ok'),
            onPress: async () => {
              dispatch(setSetting('courseInformationSharing', enabled));
              try {
                await uploadCourses(courses);
              } catch {}
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

  useEffect(() => {
    dispatch(setSetting('courseInformationSharingBadgeShown', true));
  }, [dispatch]);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="info-outline"
          primaryText={t('courseInformationSharing')}
          switchValue={courseInformationSharing}
          onSwitchValueChange={handleEnable}
          type="switch"
        />
        <Caption style={styles.caption}>
          {getLocale().startsWith('zh')
            ? courseInformationSharing
              ? '退出课程信息共享计划后，课程信息将不再自动上传。'
              : '加入课程信息共享计划后，当前学期的课程信息（包括课程号、课程名、任课教师、上课时间和地点）会自动上传至 courseX 平台，共享给其他用户。上传内容不包含任何个人信息。\n\n你可以通过 courseX 查询所有已上传课程的信息，如上课时间和地点等。'
            : courseInformationSharing
            ? 'Course information will stop being uploaded after you turn off Course Information Sharing.'
            : 'Information of courses (e.g. course number, name, lecturer, time and locations) of the current semester will be uploaded to courseX after you turn on Course Information Sharing. The information will be available to others. Personal information will never be uploaded or shared.\n\nYou can search for interesting courses and learn when and where they take place using courseX.'}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="open-in-new"
          primaryText={t('courseX')}
          type="none"
          onPress={() => Linking.openURL('https://tsinghua.app/courses')}
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

export default CourseInformationSharing;
