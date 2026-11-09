import { Linking, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SafeArea from 'components/SafeArea';
import ScrollView from 'components/ScrollView';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';
import { SettingsStackParams } from './types';
import { Text, Title } from 'components/Text';

type Props = NativeStackScreenProps<SettingsStackParams, 'Help'>;

const Help: React.FC<Props> = () => {
  const theme = useTheme();
  const link = { color: theme.colors.primary };

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewPaddings}
      >
        <Title>{t('githubRecommended')}</Title>
        <Text
          style={[styles.text, link]}
          onPress={() =>
            Linking.openURL(
              'https://github.com/robertying/learnX/issues/new/choose',
            )
          }
        >
          {t('createNewGitHubIssue')}
        </Text>
        <Title style={styles.marginTop}>{t('emailNotRecommended')}</Title>
        <Text
          style={[styles.text, link]}
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}
        >
          learnX@ruiying.io
        </Text>
        <Title style={styles.marginTop}>{t('issueTemplate')}</Title>
        <Text style={styles.text}>{t('issueTemplateDescription')}</Text>
        <Text>{t('issueTemplateContent')}</Text>
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
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

export default Help;
