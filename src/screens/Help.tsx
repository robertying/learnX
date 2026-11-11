import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormParagraph,
  FormScreen,
  FormSection,
} from 'components/Form';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from './types';

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
          onPress={() =>
            Linking.openURL(
              'https://github.com/robertying/learnX/issues/new/choose',
            )
          }
        />
      </FormSection>
      <FormSection title={t('emailNotRecommended')}>
        <FormButton
          icon="email"
          title="learnX@ruiying.io"
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}
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
