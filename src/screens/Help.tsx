import {Linking, ScrollView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Title, Text} from 'react-native-paper';
import Colors from 'constants/Colors';
import SafeArea from 'components/SafeArea';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {t} from 'helpers/i18n';
import {ScreenParams} from './types';

const Help: React.FC<NativeStackScreenProps<ScreenParams, 'Help'>> = props => {
  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewPaddings}>
        <Title>{t('email')}</Title>
        <Text
          style={[styles.text, styles.link]}
          onPress={() => Linking.openURL('mailto:yingrui205@gmail.com')}>
          yingrui205@gmail.com
        </Text>
        <Title style={styles.marginTop}>GitHub</Title>
        <Text
          style={[styles.text, styles.link]}
          onPress={() =>
            Linking.openURL('https://github.com/robertying/learnX/issues')
          }>
          GitHub Issues
        </Text>
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
