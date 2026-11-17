import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeatureList from 'components/FeatureList';
import { setWelcomeSeen } from 'data/appState';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import { isElectron } from 'helpers/platform';
import { LoginStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<LoginStackParams, 'Welcome'>;

/**
 * What learnX does about deadlines here: the Mac has no widgets, and Windows
 * and Linux have neither widgets nor a calendar to sync to, only an export.
 */
const deadlinesBody = () =>
  isElectron()
    ? t('welcomeDeadlinesBodyElectron')
    : DeviceInfo.isMac()
      ? t('welcomeDeadlinesBodyMac')
      : t('welcomeDeadlinesBody');

/**
 * The first page of a new install, before the login: what learnX does, and a
 * Continue button. Shown until it's closed once (`welcomeSeen`).
 */
const Welcome: React.FC<Props> = ({ navigation }) => (
  <FeatureList
    testID="welcome"
    logo
    title={t('welcomeTitle')}
    features={[
      {
        icon: 'afternoon',
        title: t('welcomeTodayTitle'),
        body: t('welcomeTodayBody'),
      },
      {
        icon: 'content',
        title: t('welcomeCoursesTitle'),
        body: t('welcomeCoursesBody'),
      },
      {
        icon: 'reminder',
        title: t('welcomeDeadlinesTitle'),
        body: deadlinesBody(),
      },
    ]}
    action={{
      label: t('continue'),
      testID: 'welcome-continue',
      onPress: () => {
        setWelcomeSeen();
        navigation.replace('Login');
      },
    }}
  />
);

export default Welcome;
