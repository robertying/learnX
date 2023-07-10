import {Image, StyleSheet, useColorScheme, View} from 'react-native';
import {useTheme} from 'react-native-paper';

const Splash: React.FC<React.PropsWithChildren<unknown>> = () => {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.center,
        {
          backgroundColor: theme.colors.surface,
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
