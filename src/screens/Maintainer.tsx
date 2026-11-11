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

type Props = NativeStackScreenProps<SettingsStackParams, 'Maintainer'>;

const Maintainer: React.FC<Props> = () => (
  <FormScreen>
    <Form>
      <FormSection>
        <FormParagraph text={t('maintainerDescription')} />
        <FormButton
          icon="email"
          title="learnX@ruiying.io"
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}
        />
      </FormSection>
    </Form>
  </FormScreen>
);

export default Maintainer;
