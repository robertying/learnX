import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import Logo from 'components/Logo';
import { useTheme } from 'theme';

const Splash: React.FC = () => {
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
