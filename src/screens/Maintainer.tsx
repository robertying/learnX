import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import { Form, FormButton, FormParagraph, FormSection } from 'components/Form';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Maintainer'>;

const Maintainer: React.FC<Props> = () => (
  <SafeArea>
    <Form>
      <FormSection>
        <FormParagraph text={t('maintainerDescription')} />
        <FormButton
          icon={{ ios: 'envelope', android: 'email-outline' }}
          title="learnX@ruiying.io"
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}
        />
      </FormSection>
    </Form>
  </SafeArea>
);

export default Maintainer;
