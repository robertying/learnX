import { useEffect } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CourseType, Language } from 'thu-learn-lib';
import { useCurrentSemester } from 'data/userData';
import { setSetting, useSettings } from 'data/settings';
import { dataSource } from 'data/source';
import { useCredentialsStore } from 'data/credentials';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import { t } from 'helpers/i18n';
import { isMockUser } from 'helpers/mock';
import { uploadCourses } from 'helpers/coursex';
import { SettingsStackParams } from './types';
import { Caption } from 'components/Text';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'CourseInformationSharing'
>;

const CourseInformationSharing: React.FC<Props> = () => {
  const currentSemesterId = useCurrentSemester();
  const courseInformationSharing = useSettings(
    settings => settings.courseInformationSharing,
  );
  const isDummyUser = useCredentialsStore(state =>
    isMockUser(state.credentials?.username),
  );

  const getCourses = async () => {
    if (!currentSemesterId) {
      return [];
    }

    const results = await dataSource.getCourseList(
      currentSemesterId,
      CourseType.STUDENT,
      Language.ZH,
    );
    const courses = results.map(course => ({
      ...course,
      semesterId: currentSemesterId,
    }));

    return courses;
  };

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
              setSetting('courseInformationSharing', enabled);
              if (isDummyUser) {
                return;
              }
              try {
                const courses = await getCourses();
                await uploadCourses(courses);
              } catch {}
            },
          },
        ],
        { cancelable: true },
      );
    } else {
      setSetting('courseInformationSharing', enabled);
    }
  };

  useEffect(() => {
    setSetting('courseInformationSharingBadgeShown', true);
  }, []);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="information-outline"
          primaryText={t('courseInformationSharing')}
          switchValue={courseInformationSharing}
          onSwitchValueChange={handleEnable}
          type="switch"
        />
        <Caption style={styles.caption}>
          {courseInformationSharing
            ? t('courseInformationSharingOnCaption')
            : t('courseInformationSharingOffCaption')}
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
