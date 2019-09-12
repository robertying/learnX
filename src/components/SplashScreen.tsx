import React from 'react';
import {Platform, SafeAreaView, View} from 'react-native';
import {useDarkMode} from 'react-native-dark-mode';

const SplashScreen = () => {
  const isDarkMode = useDarkMode();

  return (
    <>
      <SafeAreaView
        style={{
          backgroundColor: isDarkMode ? 'black' : 'white',
          flex: 1,
        }}>
        <View
          style={{
            backgroundColor: isDarkMode ? 'black' : 'white',
            height: Platform.OS === 'ios' ? 52 + 44 : 56,
          }}
        />
        <View
          style={{
            backgroundColor: isDarkMode ? 'rgb(28,28,30)' : '#f0f0f0',
            flex: 1,
          }}
        />
        <View
          style={{
            height: Platform.OS === 'android' ? 50 : 49,
            backgroundColor: isDarkMode ? 'black' : 'white',
          }}
        />
      </SafeAreaView>
    </>
  );
};

export default SplashScreen;
