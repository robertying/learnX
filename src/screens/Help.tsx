import {Linking, ScrollView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Title, Text} from 'react-native-paper';
import Colors from 'constants/Colors';
import SafeArea from 'components/SafeArea';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {t} from 'helpers/i18n';
import {SettingsStackParams} from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'Help'>;

const Help: React.FC<Props> = props => {
  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewPaddings}>
        <Title>{t('githubRecommended')}</Title>
        <Text
          style={[styles.text, styles.link]}
          onPress={() =>
            Linking.openURL(
              'https://github.com/robertying/learnX/issues/new/choose',
            )
          }>
          {t('createNewGitHubIssue')}
        </Text>
        <Title style={styles.marginTop}>{t('emailNotRecommended')}</Title>
        <Text
          style={[styles.text, styles.link]}
          onPress={() => Linking.openURL('mailto:learnX@ruiying.io')}>
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
  link: {
    color: Colors.theme,
  },
});

export default Help;
