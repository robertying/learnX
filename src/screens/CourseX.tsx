import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {ProgressBar} from 'react-native-paper';
import WebView from 'react-native-webview';
import {StackScreenProps} from '@react-navigation/stack';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';

const CourseX: React.FC<StackScreenProps<ScreenParams, 'CourseX'>> = ({
  route,
}) => {
  const courseId = route.params?.id ?? '';

  const [progress, setProgress] = useState(0);

  return (
    <SafeArea>
      {progress && progress !== 1 ? <ProgressBar progress={progress} /> : null}
      <WebView
        style={styles.webview}
        source={{
          uri:
            'https://tsinghua.app/courses' + (courseId ? `/${courseId}` : ''),
        }}
        originWhitelist={['https://']}
        decelerationRate="normal"
        androidHardwareAccelerationDisabled={true}
        onLoadProgress={({nativeEvent}) => {
          setProgress(nativeEvent.progress);
        }}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
});

export default CourseX;
