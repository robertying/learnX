import { Linking, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import { SettingsStackParams } from './types';
import { Text } from 'components/Text';

type Props = NativeStackScreenProps<SettingsStackParams, 'Maintainer'>;

const Maintainer: React.FC<Props> = () => {
  const theme = useTheme();
  const link = { color: theme.colors.primary };

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewPaddings}
      >
        <Text style={styles.text}>{t('maintainerDescription')}</Text>
        <Text
          style={[styles.text, link]}
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
});

export default Maintainer;
