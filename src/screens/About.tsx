import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'constants/DeviceInfo';
import {
  Form,
  FormButton,
  FormScreen,
  FormSection,
  FormText,
} from 'components/Form';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from './types';
import packageJson from '../../package.json';

type Props = NativeStackScreenProps<SettingsStackParams, 'About'>;

const contributors = [
  { name: 'Rui Ying', github: 'robertying' },
  { name: 'HeziCyan', github: 'hezicyan' },
  { name: 'Yinuo Chen', github: 'Brunch-Life' },
  { name: 'Junbo Niu', github: 'lyrenius' },
];

const openGitHub = (path: string) =>
  Linking.openURL(`https://github.com/${path}`);

const About: React.FC<Props> = () => (
  <FormScreen>
    <Form>
      <FormSection footer="© 2026 Rui Ying">
        <FormText
          icon="info"
          title={t('versionInformation')}
          detail={`${packageJson.version} (${DeviceInfo.buildNo()})`}
        />
        <FormButton
          icon="code"
          title={t('sourceCode')}
          detail="robertying/learnX"
          onPress={() => openGitHub('robertying/learnX')}
        />
        <FormButton
          icon="license"
          // oxlint-disable-next-line learnx/no-han-outside-translations -- ICP filing number, shown as filed
          title="浙ICP备20024838号-2A"
          onPress={() => Linking.openURL('https://beian.miit.gov.cn/')}
        />
      </FormSection>
      <FormSection title={t('contributors')}>
        {contributors.map(({ name, github }) => (
          <FormButton
            key={github}
            icon="person"
            title={name}
            detail={github}
            onPress={() => openGitHub(github)}
          />
        ))}
      </FormSection>
      <FormSection title={t('specialThanks')}>
        <FormButton
          icon="library"
          title="Harry Chen"
          detail="thu-learn-lib"
          onPress={() => openGitHub('Harry-Chen/thu-learn-lib')}
        />
        <FormText icon="design" title="Yayu Xiao" detail={t('appIcon')} />
      </FormSection>
      <FormSection title={t('opensourceDependencies')}>
        {Object.keys(packageJson.dependencies).map(name => (
          <FormText key={name} title={name} />
        ))}
      </FormSection>
    </Form>
  </FormScreen>
);

export default About;
