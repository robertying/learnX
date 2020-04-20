import React from 'react';
import {
  Platform,
  SafeAreaView,
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Colors from '../constants/Colors';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  block1: {
    height: Platform.OS === 'ios' ? 52 + 44 : 56,
  },
  block2: {
    height: Platform.OS === 'android' ? 50 : 49,
  },
});

const SplashScreen: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <>
      <SafeAreaView
        style={[
          styles.root,
          {
            backgroundColor: Colors.system('background', colorScheme),
          },
        ]}>
        <View
          style={[
            styles.block1,
            {
              backgroundColor: Colors.system('background', colorScheme),
            },
          ]}
        />
        <View
          style={[
            styles.root,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgb(28,28,30)' : '#f0f0f0',
            },
          ]}
        />
        <View
          style={[
            styles.block2,
            {
              backgroundColor: Colors.system('background', colorScheme),
            },
          ]}
        />
      </SafeAreaView>
    </>
  );
};

export default SplashScreen;
