import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormParagraph,
  FormScreen,
  FormSection,
} from 'components/Form';
import Urls, { supportEmail } from 'constants/Urls';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Help'>;

// The template's lines, without the indentation of the translation file.
const issueTemplate = () =>
  t('issueTemplateContent')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

const Help: React.FC<Props> = () => (
  <FormScreen>
    <Form>
      <FormSection title={t('githubRecommended')}>
        <FormButton
          icon="feedback"
          title={t('createNewGitHubIssue')}
          onPress={() => Linking.openURL(`${Urls.repo}/issues/new/choose`)}
        />
      </FormSection>
      <FormSection title={t('emailNotRecommended')}>
        <FormButton
          icon="email"
          title={supportEmail}
          onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
        />
      </FormSection>
      <FormSection
        title={t('issueTemplate')}
        footer={t('issueTemplateDescription')}
      >
        <FormParagraph text={issueTemplate()} />
      </FormSection>
    </Form>
  </FormScreen>
);

export default Help;
