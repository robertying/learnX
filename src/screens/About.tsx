import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'constants/DeviceInfo';
import SafeArea from 'components/SafeArea';
import { Form, FormButton, FormSection, FormText } from 'components/Form';
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
  <SafeArea>
    <Form>
      <FormSection footer="© 2026 Rui Ying">
        <FormText
          icon={{ ios: 'info.circle', android: 'information-outline' }}
          title={t('versionInformation')}
          detail={`${packageJson.version} (${DeviceInfo.buildNo()})`}
        />
        <FormButton
          icon={{
            ios: 'chevron.left.forwardslash.chevron.right',
            android: 'code-tags',
          }}
          title={t('sourceCode')}
          detail="robertying/learnX"
          onPress={() => openGitHub('robertying/learnX')}
        />
        <FormButton
          icon={{ ios: 'checkmark.shield', android: 'shield-check-outline' }}
          // oxlint-disable-next-line learnx/no-han-outside-translations -- ICP filing number, shown as filed
          title="浙ICP备20024838号-2A"
          onPress={() => Linking.openURL('https://beian.miit.gov.cn/')}
        />
      </FormSection>
      <FormSection title={t('contributors')}>
        {contributors.map(({ name, github }) => (
          <FormButton
            key={github}
            icon={{ ios: 'person', android: 'account-outline' }}
            title={name}
            detail={github}
            onPress={() => openGitHub(github)}
          />
        ))}
      </FormSection>
      <FormSection title={t('specialThanks')}>
        <FormButton
          icon={{ ios: 'books.vertical', android: 'bookshelf' }}
          title="Harry Chen"
          detail="thu-learn-lib"
          onPress={() => openGitHub('Harry-Chen/thu-learn-lib')}
        />
        <FormText
          icon={{ ios: 'paintbrush', android: 'brush-outline' }}
          title="Yayu Xiao"
          detail={t('appIcon')}
        />
      </FormSection>
      <FormSection title={t('opensourceDependencies')}>
        {Object.keys(packageJson.dependencies).map(name => (
          <FormText key={name} title={name} />
        ))}
      </FormSection>
    </Form>
  </SafeArea>
);

export default About;
