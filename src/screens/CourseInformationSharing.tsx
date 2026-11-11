import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Language } from '@robertying/thu-learn-lib';
import { useCurrentSemester } from 'data/userData';
import { setSetting, useSettings } from 'data/settings';
import { setCourseSharingSeen } from 'data/appState';
import { dataSource } from 'data/source';
import {
  Form,
  FormButton,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { t } from 'helpers/i18n';
import { uploadCourses } from 'helpers/coursex';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'CourseInformationSharing'
>;

const CourseInformationSharing: React.FC<Props> = () => {
  const currentSemesterId = useCurrentSemester();
  const courseInformationSharing = useSettings(
    settings => settings.courseInformationSharing,
  );

  const getCourses = async () => {
    if (!currentSemesterId) {
      return [];
    }

    const results = await dataSource.getCourseList(currentSemesterId, {
      lang: Language.ZH,
    });
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
            text: t('join'),
            onPress: async () => {
              setSetting('courseInformationSharing', enabled);
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
    setCourseSharingSeen();
  }, []);

  return (
    <FormScreen>
      <Form>
        <FormSection
          footer={
            courseInformationSharing
              ? t('courseInformationSharingOnCaption')
              : t('courseInformationSharingOffCaption')
          }
        >
          <FormToggle
            icon="info"
            title={t('courseInformationSharing')}
            value={courseInformationSharing}
            onValueChange={handleEnable}
          />
        </FormSection>
        <FormSection>
          <FormButton
            icon="openInBrowser"
            title={t('courseX')}
            onPress={() => Linking.openURL('https://tsinghua.app/courses')}
          />
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default CourseInformationSharing;
