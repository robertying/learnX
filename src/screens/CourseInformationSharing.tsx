import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Language } from '@robertying/thu-learn-lib';
import { useCurrentSemester } from 'data/userData';
import { setSetting, useSettings } from 'data/settings';
import { setCourseSharingSeen } from 'data/appState';
import { dataSource } from 'data/source';
import { useCredentialsStore } from 'data/credentials';
import { Form, FormButton, FormSection, FormToggle } from 'components/Form';
import SafeArea from 'components/SafeArea';
import { t } from 'helpers/i18n';
import { isMockUser } from 'helpers/mock';
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
  const isDummyUser = useCredentialsStore(state =>
    isMockUser(state.credentials?.username),
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
    setCourseSharingSeen();
  }, []);

  return (
    <SafeArea>
      <Form>
        <FormSection
          footer={
            courseInformationSharing
              ? t('courseInformationSharingOnCaption')
              : t('courseInformationSharingOffCaption')
          }
        >
          <FormToggle
            icon={{ ios: 'info.circle', android: 'information-outline' }}
            title={t('courseInformationSharing')}
            value={courseInformationSharing}
            onValueChange={handleEnable}
          />
        </FormSection>
        <FormSection>
          <FormButton
            icon={{ ios: 'safari', android: 'open-in-new' }}
            title={t('courseX')}
            onPress={() => Linking.openURL('https://tsinghua.app/courses')}
          />
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default CourseInformationSharing;
