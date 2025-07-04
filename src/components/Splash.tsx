import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import Logo from 'components/Logo';

const Splash: React.FC<React.PropsWithChildren<unknown>> = () => {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.center,
        {
          backgroundColor:
            Platform.OS === 'android'
              ? theme.colors.surface
              : colorScheme === 'dark'
                ? 'black'
                : 'white',
        },
      ]}
    >
      <Logo iosSize={160} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Splash;
