import React from 'react';
import {Image, StyleSheet, useColorScheme, View} from 'react-native';

const Splash: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <View
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
    </View>
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
