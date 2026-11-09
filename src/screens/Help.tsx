import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import { Form, FormButton, FormParagraph, FormSection } from 'components/Form';
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
  <SafeArea>
    <Form>
      <FormSection title={t('githubRecommended')}>
        <FormButton
          icon={{ ios: 'exclamationmark.bubble', android: 'github' }}
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
          icon={{ ios: 'envelope', android: 'email-outline' }}
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
  </SafeArea>
);

export default Help;
