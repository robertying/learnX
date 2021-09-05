import {Linking, ScrollView, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Title, Text} from 'react-native-paper';
import DeviceInfo from 'react-native-device-info';
import Colors from 'constants/Colors';
import SafeArea from 'components/SafeArea';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {t} from 'helpers/i18n';
import {ScreenParams} from './types';
import packageJson from '../../package.json';

const About: React.FC<NativeStackScreenProps<ScreenParams, 'About'>> =
  props => {
    useNavigationAnimation(props);

    return (
      <SafeArea>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewPaddings}>
          <Title>{t('versionInformation')}</Title>
          <Text style={styles.text}>
            {`v${packageJson.version} (build ${DeviceInfo.getBuildNumber()})`}
          </Text>
          <Text style={styles.text}>Copyright (c) 2021 Rui Ying</Text>
          <Text style={styles.text}>
            {t('opensourceAt')}{' '}
            <Text
              style={styles.link}
              onPress={() =>
                Linking.openURL('https://github.com/robertying/learnX')
              }>
              robertying/learnX
            </Text>
          </Text>
          <Title style={styles.marginTop}>{t('specialThanks')}</Title>
          <Text style={styles.text}>
            {t('harryChen')}{' '}
            <Text
              style={styles.link}
              onPress={() =>
                Linking.openURL('https://github.com/Harry-Chen/thu-learn-lib')
              }>
              Harry-Chen/thu-learn-lib
            </Text>
          </Text>
          <Text style={styles.text}>{t('yayuXiao')}</Text>
          <Title style={styles.marginTop}>{t('opensourceDependencies')}</Title>
          {Object.keys(packageJson.dependencies).map(name => (
            <Text key={name} style={styles.text}>
              {name}
            </Text>
          ))}
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

export default About;
