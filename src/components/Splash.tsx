import React from 'react';
import {Image, StyleSheet, useColorScheme} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const Splash: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      style={[
        styles.center,
        {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
      ]}>
      <Image
        style={styles.logo}
        source={
          colorScheme === 'dark'
            ? require('../../ios/learnX/Assets.xcassets/MaskedAppIcon.imageset/Black.png')
            : require('../../ios/learnX/Assets.xcassets/MaskedAppIcon.imageset/MaskedAppIcon.png')
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
});

export default Splash;
