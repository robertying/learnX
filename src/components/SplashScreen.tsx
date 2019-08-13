import React from 'react';
import {Platform, SafeAreaView, View} from 'react-native';

const SplashScreen = () => (
  <>
    <SafeAreaView
      style={{
        backgroundColor: 'white',
        flex: 1,
      }}>
      <View
        style={{
          backgroundColor: 'white',
          height: Platform.OS === 'ios' ? 52 + 44 : 56,
        }}
      />
      <View style={{backgroundColor: '#f0f0f0', flex: 1}} />
      <View
        style={{
          height: Platform.OS === 'android' ? 50 : 49,
          backgroundColor: 'white',
        }}
      />
    </SafeAreaView>
  </>
);

export default SplashScreen;
