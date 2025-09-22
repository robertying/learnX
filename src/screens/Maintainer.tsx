import { Linking, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from 'react-native-paper';
import Colors from 'constants/Colors';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Maintainer'>;

const Maintainer: React.FC<Props> = props => {
  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewPaddings}
      >
        <Text style={styles.text}>{t('maintainerDescription')}</Text>
        <Text
          style={[styles.text, styles.link]}
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}
        >
          learnX@ruiying.io
        </Text>
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    paddingHorizontal: 24,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  text: {
    marginTop: 8,
  },
  link: {
    color: Colors.theme,
  },
});

export default Maintainer;
