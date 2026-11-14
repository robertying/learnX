import { Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Form,
  FormButton,
  FormParagraph,
  FormScreen,
  FormSection,
} from 'components/Form';
import { supportEmail } from 'constants/Urls';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Maintainer'>;

const Maintainer: React.FC<Props> = () => (
  <FormScreen>
    <Form testID="maintainer">
      <FormSection>
        <FormParagraph text={t('maintainerDescription')} />
        <FormButton
          icon="email"
          title={supportEmail}
          onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
        />
      </FormSection>
    </Form>
  </FormScreen>
);

export default Maintainer;
