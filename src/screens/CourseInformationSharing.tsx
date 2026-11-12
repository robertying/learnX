import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setSetting, useSettings } from 'data/settings';
import { setCourseSharingSeen } from 'data/appState';
import {
  Form,
  FormButton,
  FormScreen,
  FormSection,
  FormToggle,
} from 'components/Form';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<
  SettingsStackParams,
  'CourseInformationSharing'
>;

const CourseInformationSharing: React.FC<Props> = () => {
  const courseInformationSharing = useSettings(
    settings => settings.courseInformationSharing,
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
            text: t('join'),
            onPress: () => {
              // The cached courses are shared from here on
              // (helpers/surfaces).
              setSetting('courseInformationSharing', enabled);
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
